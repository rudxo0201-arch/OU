import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { completeWithFallback } from '@/lib/llm/router';
import { getDomainConfig } from '@/lib/pipeline/extraction/registry';
import { buildExtractionPrompt } from '@/lib/pipeline/extraction/base-prompt';
import { extractAll } from '@/lib/pipeline/extraction';

export const maxDuration = 30;

/**
 * Orb 입력창 전용 엔드포인트.
 *
 * /api/quick(QSBar inbox)와 달리:
 * - 도메인이 이미 확정된 상태로 호출됨
 * - LLM 동기 파싱 (Haiku) — 즉시 응답 전까지 저장 보류
 * - 모호한 경우 clarification 질문 반환 (저장 안 함)
 * - 명확하면 DB 저장 후 saved: true 반환
 *
 * Response:
 *   { ok: true, saved: true, nodeId, domain, title }
 *   { ok: true, saved: false, clarification: string }   ← 모호한 경우
 */
export async function POST(req: NextRequest) {
  try {
    const { text, domain, kind, clarificationAnswer } = await req.json();

    if (!text?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 });
    if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 });

    const raw = text.trim();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
    const now = new Date();
    const currentTime = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul',
    });

    // clarification 응답이 함께 온 경우 → 원본 + 답변을 합쳐 재파싱
    const inputText = clarificationAnswer
      ? `${raw}\n[추가 정보: ${clarificationAnswer}]`
      : raw;

    const config = getDomainConfig(domain);
    const systemPrompt = buildOrbInputPrompt(config.rules, config.schema, today, currentTime, domain);

    const result = await completeWithFallback(
      [{ role: 'user', content: inputText }],
      { system: systemPrompt, maxTokens: 1024, operation: 'orb_input' },
    );

    const parsed = parseOrbInputResult(result.text);

    // clarification 반환 — 저장 안 함
    if (parsed.type === 'clarification') {
      return NextResponse.json({
        ok: true,
        saved: false,
        clarification: parsed.question,
      });
    }

    // 저장
    if (!user) {
      return NextResponse.json({ ok: true, saved: false, clarification: '로그인이 필요합니다.' });
    }

    const admin = createAdminClient();
    const domainData: Record<string, unknown> = {
      ...parsed.domain_data,
      ...(domain === 'habit' ? { kind: kind ?? 'definition' } : kind ? { kind } : {}),
    };

    const { data: node, error } = await admin.from('data_nodes').insert({
      user_id: user.id,
      domain,
      raw,
      source_type: 'orb_input',
      confidence: 'high',
      resolution: 'resolved',
      domain_data: domainData,
    }).select('id, domain_data').single();

    if (error) {
      console.error('[OrbInput] insert error:', error);
      return NextResponse.json({ error: 'failed' }, { status: 500 });
    }

    // 백그라운드: entity/relation 추출 보강 (선택)
    if (node?.id) {
      extractAll(raw, domain, today)
        .then(full => {
          if (full.confidence === 'low') return;
          return admin.from('data_nodes').update({
            domain_data: {
              ...domainData,
              ...full.domain_data,
            },
            confidence: full.confidence,
          }).eq('id', node.id);
        })
        .catch(e => console.error('[OrbInput/enrich] failed:', e));
    }

    const dd = node?.domain_data as Record<string, unknown> | undefined;
    return NextResponse.json({
      ok: true,
      saved: true,
      nodeId: node?.id ?? null,
      domain,
      title: (dd?.title ?? dd?.what ?? dd?.text ?? null) as string | null,
    });
  } catch (e) {
    console.error('[OrbInput] error:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

/**
 * Orb 입력창 전용 시스템 프롬프트.
 * extractAll과 달리 clarification 분기가 포함된다.
 */
function buildOrbInputPrompt(
  rules: string,
  schema: Record<string, string>,
  today: string,
  currentTime: string,
  domain: string,
): string {
  const schemaLines = Object.entries(schema)
    .map(([f, d]) => `  ${f}: ${d}`)
    .join('\n');

  return `## 오늘 날짜
${today}
## 현재 시각
${currentTime}

## 도메인: ${domain}

## 추출할 필드
\`\`\`
${schemaLines}
\`\`\`

## 규칙
${rules}

## 판단 기준
- 필수 필드를 명확히 채울 수 있으면 → extracted 응답
- 핵심 정보가 모호하거나 두 가지 이상으로 해석될 여지가 있으면 → clarification 응답
  예: "12기 점심" → 숫자 "12"가 시각인지 다른 의미인지 모호 → clarification
  예: "헬스 3세트" → domain=habit인데 정기 습관인지 오늘 한 번인지 모호 → clarification
  예: "내일 3시 미팅" → 명확 → extracted

## 출력 형식 (JSON만, 설명 없이)

명확한 경우:
\`\`\`json
{ "type": "extracted", "domain_data": { /* 필드 */ } }
\`\`\`

모호한 경우:
\`\`\`json
{ "type": "clarification", "question": "어떤 점이 모호한지 짧은 질문 (30자 이내)" }
\`\`\`

빈 필드는 생략. null/""/없음 출력 금지.`;
}

type OrbInputParsed =
  | { type: 'extracted'; domain_data: Record<string, unknown> }
  | { type: 'clarification'; question: string };

function parseOrbInputResult(text: string): OrbInputParsed {
  try {
    const clean = text
      .replace(/```json?\n?/g, '')
      .replace(/\n?```/g, '')
      .trim();

    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('no JSON');

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.type === 'clarification' && parsed.question) {
      return { type: 'clarification', question: parsed.question };
    }

    if (parsed.type === 'extracted' && parsed.domain_data) {
      const dd = typeof parsed.domain_data === 'object' ? parsed.domain_data : {};
      const clean2 = Object.fromEntries(
        Object.entries(dd as Record<string, unknown>)
          .filter(([, v]) => v !== null && v !== undefined && v !== ''),
      );
      return { type: 'extracted', domain_data: clean2 };
    }

    // 예상 못한 형식 → fallback extracted
    return { type: 'extracted', domain_data: { content: text.slice(0, 200) } };
  } catch {
    return { type: 'extracted', domain_data: { content: text.slice(0, 200) } };
  }
}
