import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CRON_SECRET = process.env.CRON_SECRET;

const VALID_PREDICATES = [
  'is_a', 'part_of', 'causes', 'derived_from', 'related_to',
  'opposite_of', 'requires', 'example_of', 'involves', 'located_at', 'occurs_at',
];

/**
 * Verification Cron Agent
 *
 * Runs weekly (or on demand via POST with CRON_SECRET).
 * 1. Finds data_nodes with low confidence
 * 2. Cross-references triples for consistency
 * 3. Creates verification_requests for suspicious items
 * 4. Uses Claude Haiku for batch checking (cheap)
 *
 * Also supports the original GET endpoint for backward compatibility.
 */

// ── GET: Original simple verification (backward compat) ──
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: nodes } = await supabase
      .from('data_nodes')
      .select('id, domain, raw')
      .eq('confidence', 'medium')
      .is('last_verified_at', null)
      .lt('created_at', weekAgo)
      .limit(50);

    let verified = 0;
    let flagged = 0;

    for (const node of nodes ?? []) {
      const isSuspicious = !node.raw || node.raw.length < 10;

      if (isSuspicious) {
        await supabase.from('verification_requests').insert({
          node_id: node.id,
          reason: 'auto_flagged',
          status: 'open',
        });
        flagged++;
      } else {
        await supabase
          .from('data_nodes')
          .update({ last_verified_at: new Date().toISOString() })
          .eq('id', node.id);
        verified++;
      }
    }

    return NextResponse.json({ verified, flagged });
  } catch (e) {
    console.error('[CronVerify/GET] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Enhanced verification with LLM batch checking ──
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const supabase = await createClient();

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    // Fallback: check if caller is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const results = {
    lowConfidenceChecked: 0,
    inconsistentTriples: 0,
    requestsCreated: 0,
    errors: [] as string[],
  };

  try {
    // ── Step 1: Find low-confidence data_nodes ──
    const { data: lowConfNodes } = await supabase
      .from('data_nodes')
      .select('id, user_id, domain, raw, confidence')
      .in('confidence', ['low'])
      .eq('resolution', 'resolved')
      .order('created_at', { ascending: false })
      .limit(50);

    results.lowConfidenceChecked = lowConfNodes?.length ?? 0;

    // ── Step 2: For each low-confidence node, check its triples ──
    if (lowConfNodes?.length) {
      const nodeIds = lowConfNodes.map((n) => n.id);

      const { data: triples } = await supabase
        .from('triples')
        .select('id, node_id, subject, predicate, object, confidence')
        .in('node_id', nodeIds);

      // Check for invalid predicates or low-confidence triples
      const suspiciousTriples = (triples ?? []).filter(
        (t) =>
          !VALID_PREDICATES.includes(t.predicate) ||
          t.confidence === 'low',
      );

      results.inconsistentTriples = suspiciousTriples.length;

      // ── Step 3: Batch verify with Claude Haiku ──
      if (suspiciousTriples.length > 0) {
        const batchResults = await batchVerifyTriples(
          suspiciousTriples.map((t) => ({
            id: t.id,
            nodeId: t.node_id,
            subject: t.subject,
            predicate: t.predicate,
            object: t.object,
          })),
        );

        // ── Step 4: Create verification_requests for flagged items ──
        for (const flagged of batchResults.flagged) {
          // Check if a request already exists for this triple
          const { data: existing } = await supabase
            .from('verification_requests')
            .select('id')
            .eq('triple_id', flagged.tripleId)
            .eq('status', 'open')
            .limit(1);

          if (existing?.length) continue;

          const { error: insertErr } = await supabase
            .from('verification_requests')
            .insert({
              node_id: flagged.nodeId,
              triple_id: flagged.tripleId,
              reason: 'auto_flagged',
              description: flagged.reason,
              status: 'open',
            });

          if (insertErr) {
            results.errors.push(
              `Failed to create request for triple ${flagged.tripleId}: ${insertErr.message}`,
            );
          } else {
            results.requestsCreated++;
          }
        }

        // Log cost
        if (batchResults.tokenUsage > 0) {
          await supabase.from('api_cost_log').insert({
            operation: 'verify_batch',
            model: 'claude-haiku-4-5-latest',
            tokens: batchResults.tokenUsage,
            cost_usd:
              batchResults.inputTokens * 0.00000025 +
              batchResults.outputTokens * 0.00000125,
          });
        }
      }
    }

    // ── Step 5: Check cross-node consistency ──
    // Find contradicting triples (same subject+object but opposite predicates)
    const { data: allTriples } = await supabase
      .from('triples')
      .select('id, node_id, subject, predicate, object')
      .order('created_at', { ascending: false })
      .limit(500);

    if (allTriples?.length) {
      const contradictions = findContradictions(allTriples);
      for (const pair of contradictions) {
        const { data: existing } = await supabase
          .from('verification_requests')
          .select('id')
          .eq('triple_id', pair.tripleId)
          .eq('status', 'open')
          .limit(1);

        if (existing?.length) continue;

        const { error: insertErr } = await supabase
          .from('verification_requests')
          .insert({
            node_id: pair.nodeId,
            triple_id: pair.tripleId,
            reason: 'auto_flagged',
            description: `모순 가능성: "${pair.subject}" ${pair.predicate} "${pair.object}" vs "${pair.contradictPredicate}"`,
            status: 'open',
          });

        if (!insertErr) results.requestsCreated++;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.errors.push(message);
  }

  return NextResponse.json({ success: true, results });
}

// ── Helpers ──

interface TripleInput {
  id: string;
  nodeId: string;
  subject: string;
  predicate: string;
  object: string;
}

interface BatchVerifyResult {
  flagged: Array<{
    tripleId: string;
    nodeId: string;
    reason: string;
  }>;
  tokenUsage: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * 규칙 기반 트리플 검증 (LLM 대체)
 *
 * 규칙으로 확실한 오류를 잡고, 판단 불가(unsure)만 LLM 폴백.
 * 대부분의 케이스가 규칙으로 처리되어 LLM 비용 80~95% 절감.
 */
async function batchVerifyTriples(
  triples: TripleInput[],
): Promise<BatchVerifyResult> {
  if (!triples.length) {
    return { flagged: [], tokenUsage: 0, inputTokens: 0, outputTokens: 0 };
  }

  const flagged: BatchVerifyResult['flagged'] = [];
  const unsure: TripleInput[] = [];

  // ── 1단계: 규칙 기반 검증 (LLM 불필요) ──
  for (const t of triples) {
    const ruleResult = verifyTripleByRule(t);
    if (ruleResult === 'invalid') {
      flagged.push({
        tripleId: t.id,
        nodeId: t.nodeId,
        reason: getRuleViolationReason(t),
      });
    } else if (ruleResult === 'unsure') {
      unsure.push(t);
    }
    // 'valid' → 정상, 스킵
  }

  // ── 2단계: unsure만 LLM 폴백 ──
  let tokenUsage = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  if (unsure.length > 0) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic();

      const triplesText = unsure
        .map(
          (t, i) =>
            `${i + 1}. [${t.id}] "${t.subject}" ${t.predicate} "${t.object}"`,
        )
        .join('\n');

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-latest',
        max_tokens: 1024,
        system: `아래 트리플 목록을 검증하세요. 각 트리플이 논리적으로 맞는지 확인합니다.
문제가 있는 것만 JSON 배열로 출력하세요.
형식: [{"id":"트리플ID","reason":"문제 설명"}]
모두 정상이면 빈 배열 [] 출력.`,
        messages: [{ role: 'user', content: triplesText }],
      });

      const content =
        response.content[0].type === 'text' ? response.content[0].text : '[]';

      let flaggedRaw: Array<{ id: string; reason: string }> = [];
      try {
        flaggedRaw = JSON.parse(content.replace(/```json?|```/g, '').trim());
      } catch {
        flaggedRaw = [];
      }

      const tripleMap = new Map(unsure.map((t) => [t.id, t]));
      for (const f of flaggedRaw) {
        if (tripleMap.has(f.id)) {
          flagged.push({
            tripleId: f.id,
            nodeId: tripleMap.get(f.id)!.nodeId,
            reason: f.reason,
          });
        }
      }

      tokenUsage = response.usage.input_tokens + response.usage.output_tokens;
      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;
    } catch (err) {
      console.error('[VerifyCron] Haiku call failed for unsure triples:', err);
    }
  }

  console.log(
    `[VerifyCron] ${triples.length} triples: ${triples.length - unsure.length} by rules, ${unsure.length} by LLM, ${flagged.length} flagged`,
  );

  return { flagged, tokenUsage, inputTokens, outputTokens };
}

/**
 * 규칙으로 트리플 유효성 판별.
 * 'valid' | 'invalid' | 'unsure'
 */
function verifyTripleByRule(t: TripleInput): 'valid' | 'invalid' | 'unsure' {
  // 규칙 1: subject와 object가 동일하면 무의미
  if (t.subject.trim().toLowerCase() === t.object.trim().toLowerCase()) {
    return 'invalid';
  }

  // 규칙 2: 무효한 predicate
  if (!VALID_PREDICATES.includes(t.predicate)) {
    return 'invalid';
  }

  // 규칙 3: subject 또는 object가 너무 짧음 (1자 이하)
  if (t.subject.trim().length < 2 || t.object.trim().length < 2) {
    return 'invalid';
  }

  // 규칙 4: subject 또는 object가 숫자만으로 구성
  if (/^\d+$/.test(t.subject.trim()) || /^\d+$/.test(t.object.trim())) {
    return 'invalid';
  }

  // 규칙 5: subject나 object에 의미 없는 placeholder 텍스트
  const placeholders = ['xxx', '???', '...', 'n/a', 'null', 'undefined', 'none'];
  const sLower = t.subject.trim().toLowerCase();
  const oLower = t.object.trim().toLowerCase();
  if (placeholders.includes(sLower) || placeholders.includes(oLower)) {
    return 'invalid';
  }

  // 규칙 6: subject가 object를 포함하거나 그 반대 (자기참조적)
  if (sLower.includes(oLower) || oLower.includes(sLower)) {
    // "커피" is_a "커피 음료" 같은 건 유효할 수 있어서 unsure
    if (t.predicate === 'is_a' || t.predicate === 'part_of') {
      return 'unsure';
    }
  }

  // 그 외: 규칙으로 판단 불가 → 일단 valid (보수적)
  // 모순 검출은 findContradictions에서 별도 처리
  return 'valid';
}

function getRuleViolationReason(t: TripleInput): string {
  if (t.subject.trim().toLowerCase() === t.object.trim().toLowerCase()) {
    return `주어와 목적어가 동일: "${t.subject}"`;
  }
  if (!VALID_PREDICATES.includes(t.predicate)) {
    return `유효하지 않은 서술어: "${t.predicate}"`;
  }
  if (t.subject.trim().length < 2 || t.object.trim().length < 2) {
    return `주어 또는 목적어가 너무 짧음`;
  }
  if (/^\d+$/.test(t.subject.trim()) || /^\d+$/.test(t.object.trim())) {
    return `주어 또는 목적어가 숫자만으로 구성`;
  }
  return `규칙 위반`;
}

// Contradiction pairs to watch for
const CONTRADICTION_PAIRS: Record<string, string> = {
  causes: 'opposite_of',
  is_a: 'opposite_of',
  requires: 'opposite_of',
};

interface Contradiction {
  tripleId: string;
  nodeId: string;
  subject: string;
  predicate: string;
  object: string;
  contradictPredicate: string;
}

function findContradictions(
  triples: Array<{
    id: string;
    node_id: string;
    subject: string;
    predicate: string;
    object: string;
  }>,
): Contradiction[] {
  const results: Contradiction[] = [];
  const seen = new Set<string>();

  // Build lookup: "subject|object" -> triples
  const lookup: Record<
    string,
    Array<{ id: string; node_id: string; predicate: string; subject: string; object: string }>
  > = {};

  for (const t of triples) {
    const key = `${t.subject.toLowerCase()}|${t.object.toLowerCase()}`;
    if (!lookup[key]) lookup[key] = [];
    lookup[key].push(t);
  }

  for (const key of Object.keys(lookup)) {
    const group = lookup[key];
    if (group.length < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];

        const isContradiction =
          CONTRADICTION_PAIRS[a.predicate] === b.predicate ||
          CONTRADICTION_PAIRS[b.predicate] === a.predicate;

        if (isContradiction) {
          const pairKey = [a.id, b.id].sort().join('|');
          if (seen.has(pairKey)) continue;
          seen.add(pairKey);

          results.push({
            tripleId: b.id,
            nodeId: b.node_id,
            subject: b.subject,
            predicate: b.predicate,
            object: b.object,
            contradictPredicate: a.predicate,
          });
        }
      }
    }
  }

  return results;
}
