import { createClient } from '@/lib/supabase/server';
import { classifyDomain } from './classifier';
import { detectUnresolved } from './unresolved';
import { isAdminEmail } from '@/lib/auth/roles';
import { extractDomainData } from './extract-domain-data';

// 수정/보충 패턴 감지
const UPDATE_PATTERNS = [
  /아까\s*말한/, /아까\s*그/, /방금\s*말한/,
  /수정/, /변경/, /업데이트/, /정정/,
  /아니고/, /아니라/, /가\s*아니라/,
  /사실은/, /실은/,
  /틀렸/, /잘못/,
  /추가로/, /그리고\s*그/, /거기에/,
];

function isUpdateMessage(text: string): boolean {
  return UPDATE_PATTERNS.some(p => p.test(text));
}

/**
 * Try to find a recent matching node to update.
 * Searches last 20 nodes for the user, matching by keyword overlap.
 */
async function findNodeToUpdate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userMessage: string,
  domain: string,
): Promise<{ id: string; domain_data: Record<string, any> | null } | null> {
  const { data: recentNodes } = await supabase
    .from('data_nodes')
    .select('id, raw, domain_data, domain')
    .eq('user_id', userId)
    .not('system_tags', 'cs', '{"archived"}')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!recentNodes?.length) return null;

  // Extract keywords from user message (Korean words >= 2 chars)
  const keywords = userMessage
    .replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2);

  if (keywords.length === 0) return null;

  // Score each node by keyword match
  let bestNode: (typeof recentNodes)[0] | null = null;
  let bestScore = 0;

  for (const n of recentNodes) {
    const raw = (n.raw ?? '').toLowerCase();
    const domainDataStr = JSON.stringify(n.domain_data ?? {}).toLowerCase();
    const combined = raw + ' ' + domainDataStr;

    let score = 0;
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) score++;
    }

    // Bonus for same domain
    if (n.domain === domain) score += 0.5;

    if (score > bestScore && score >= 1) {
      bestScore = score;
      bestNode = n;
    }
  }

  return bestNode ? { id: bestNode.id, domain_data: bestNode.domain_data as Record<string, any> | null } : null;
}

interface SaveMessageInput {
  userId?: string;
  groupId?: string | null;
  userMessage: string;
  assistantMessage: string;
}

export async function saveMessageAsync(input: SaveMessageInput) {
  const supabase = await createClient();

  // 비로그인은 메시지/노드 저장 스킵 (DB FK 제약)
  if (!input.userId) {
    const { domain, viewHint, confidence: conf } = await classifyDomain(
      input.userMessage + '\n' + input.assistantMessage
    );
    return { node: null, domain, viewHint, confidence: conf };
  }

  const { data: userMsg, error: msgErr } = await supabase.from('messages').insert({
    user_id: input.userId,
    role: 'user',
    raw: input.userMessage,
    type: 'chat',
  }).select().single();

  if (msgErr || !userMsg) {
    console.error('[Layer2] message insert failed:', msgErr?.message);
    // 메시지 저장 실패 시에도 DataNode 생성은 진행 (데이터 손실 방지)
    // 하지만 pair_id 없이 assistant 메시지 저장
  }

  const { data: assistantMsg } = await supabase.from('messages').insert({
    user_id: input.userId,
    role: 'assistant',
    raw: input.assistantMessage,
    type: 'chat',
    pair_id: userMsg?.id ?? null,
  }).select().single();

  const { domain, viewHint, confidence } = await classifyDomain(
    input.userMessage + '\n' + input.assistantMessage
  );

  // Update detection: if the user is correcting/supplementing existing data
  if (isUpdateMessage(input.userMessage)) {
    try {
      const existing = await findNodeToUpdate(
        supabase,
        input.userId,
        input.userMessage,
        domain,
      );

      if (existing) {
        // 기존 raw에 append (히스토리 보존)
        const { data: currentNode } = await supabase
          .from('data_nodes')
          .select('raw')
          .eq('id', existing.id)
          .single();

        const mergedRaw = currentNode?.raw
          ? `${currentNode.raw}\n---\n${input.userMessage}`
          : input.userMessage;

        const { error: updateErr } = await supabase
          .from('data_nodes')
          .update({
            raw: mergedRaw,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (!updateErr) {
          // Still save messages for history
          // Return the updated node
          return { node: { id: existing.id } as any, domain, viewHint, confidence };
        }
        // If update fails, fall through to insert
      }
    } catch (e) {
      console.error('[Layer2] update detection failed, falling through to insert:', e);
    }
  }

  // 관리자가 채팅으로 생성하는 노드는 기본적으로 운영 데이터로 격리
  let adminInternalData: Record<string, any> | undefined;
  if (input.userId) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', input.userId)
      .single();

    if (userProfile?.email && isAdminEmail(userProfile.email)) {
      adminInternalData = { _admin_internal: true, _visibility_locked: true };
    }
  }

  const domainData = {
    ...extractDomainData(input.userMessage, domain),
    ...(adminInternalData ?? {}),
  };

  const { data: node, error: nodeErr } = await supabase.from('data_nodes').insert({
    user_id: input.userId,
    group_id: input.groupId ?? null,
    message_id: assistantMsg?.id,
    domain,
    raw: input.userMessage,
    source_type: 'chat',
    confidence,
    resolution: 'resolved',
    view_hint: viewHint,
    visibility: 'private',
    domain_data: domainData,
  }).select().single();

  if (nodeErr) {
    console.error('[Layer2] data_node insert failed:', nodeErr.message);
    return { node: null, domain, viewHint, confidence };
  }

  if (node) {
    // Section + Sentences 생성 (Layer 3가 처리할 수 있도록)
    try {
      const { data: sec } = await supabase.from('sections').insert({
        node_id: node.id,
        heading: domain ?? 'chat',
        order_idx: 0,
      }).select().single();

      if (sec) {
        // 문장 분리: ". " / "。" / 줄바꿈 기준
        const rawSentences = input.userMessage
          .split(/(?<=[.!?])\s+|。|\n+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);

        // 최소 1개 문장 보장
        const sentences = rawSentences.length > 0 ? rawSentences : [input.userMessage.trim()];

        for (let j = 0; j < sentences.length; j++) {
          await supabase.from('sentences').insert({
            section_id: sec.id,
            node_id: node.id,
            text: sentences[j],
            order_idx: j,
            embed_status: 'pending',
            embed_tier: 'hot',
          });
        }
      }
    } catch (e) {
      console.error('[Layer2] section/sentence insert failed:', e);
    }

    // UNRESOLVED 감지 (실패해도 무시)
    detectUnresolved({
      userId: input.userId,
      nodeId: node.id,
      text: input.userMessage,
      contextSnippet: [
        { role: 'user', text: input.userMessage },
        { role: 'assistant', text: input.assistantMessage },
      ],
    }).catch(e => console.error('[Layer2] unresolved failed:', e));

    // Layer 3: 임베딩 + 트리플 (비동기, 실패 무시)
    import('./layer3').then(({ embedPendingSentences, extractTriples }) => {
      embedPendingSentences(node.id).catch(e => console.error('[Layer3] embed failed:', e));
      extractTriples(node.id).catch(e => console.error('[Layer3] triple failed:', e));
    }).catch(() => {});
  }

  // 토큰 사용량 기록 (대략 추정: 한글 1자 ≈ 2토큰, 영어 1단어 ≈ 1토큰)
  const estimatedTokens = Math.max(
    1,
    Math.ceil((input.userMessage.length + input.assistantMessage.length) / 2)
  );
  await supabase.from('token_usage').insert({
    user_id: input.userId,
    operation: 'chat',
    tokens_used: estimatedTokens,
  });

  return { node, domain, viewHint, confidence };
}
