import { createClient } from '@/lib/supabase/server';

const UNRESOLVED_PATTERNS = [
  { pattern: /\b(걔|걔네|그 사람|그분|그녀|그|쟤)\b/g, type: 'person' },
  { pattern: /\b(거기|그곳|저기|거기서)\b/g, type: 'location' },
  { pattern: /\b(그것|그거|그게|그걸|이것|이거)\b/g, type: 'thing' },
  { pattern: /\b(그 일|그 얘기|그때 일|그 사건)\b/g, type: 'event' },
];

/** 도메인별 권장 필드 — 빠지면 accuracy 큐에 추가 */
const DOMAIN_RECOMMENDED_FIELDS: Record<string, Array<{ field: string; label: string }>> = {
  schedule: [
    { field: 'time', label: '시간' },
    { field: 'location', label: '장소' },
  ],
  finance: [
    { field: 'category', label: '카테고리' },
  ],
  relation: [
    { field: 'relationship', label: '관계' },
  ],
};

interface DetectInput {
  userId?: string;
  nodeId: string;
  text: string;
  domain?: string;
  domainData?: Record<string, any>;
  contextSnippet: Array<{ role: string; text: string }>;
}

export async function detectUnresolved(input: DetectInput) {
  if (!input.userId) return;

  const supabase = await createClient();
  const found: Array<{ raw: string; type: string }> = [];

  // 1. 대명사/모호한 참조 감지
  for (const { pattern, type } of UNRESOLVED_PATTERNS) {
    const matches = input.text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!found.find(f => f.raw === match)) {
          found.push({ raw: match, type });
        }
      });
    }
  }

  // 2. 빈 필드 감지 — 도메인별 권장 필드가 비어있으면 추가
  if (input.domain && input.domainData) {
    const recommended = DOMAIN_RECOMMENDED_FIELDS[input.domain];
    if (recommended) {
      for (const { field, label } of recommended) {
        if (!input.domainData[field]) {
          found.push({
            raw: `[${label} 없음]`,
            type: 'missing_field',
          });
        }
      }
    }
  }

  // 3. 모호한 날짜 감지 — 다음주/이번주 단독 (요일 미지정)
  if (input.domain === 'schedule' && input.domainData?._dateAmbiguous) {
    found.push({
      raw: `[${input.domainData._dateHint || '날짜'} — 정확한 시작일]`,
      type: 'ambiguous_date',
    });
  }

  if (found.length === 0) return;

  try {
    await supabase.from('unresolved_entities').insert(
      found.map(f => ({
        user_id: input.userId,
        raw_text: f.raw,
        context_snippet: JSON.stringify(input.contextSnippet),
        placeholder_node_id: input.nodeId,
        resolution_status: 'pending',
      }))
    );
  } catch { /* 테이블 없어도 무시 */ }
}
