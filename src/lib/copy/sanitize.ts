/**
 * 내부 용어 → 일상 용어 변환
 * API 응답, 에러 메시지에서 내부 구조 노출 방지
 * 보안 레벨로 취급 — 내부 용어 노출 = 보안 사고
 */

const TERM_MAP: Record<string, string> = {
  // DB 테이블명
  'data_node': '데이터',
  'data_nodes': '데이터',
  'DataNode': '데이터',
  'dataNode': '데이터',
  'triple': '관계',
  'triples': '관계',
  'Triple': '관계',
  'predicate': '연결',
  'predicates': '연결',
  'section': '단락',
  'sections': '단락',
  'sentence': '문장',
  'sentences': '문장',
  'node_relation': '연결',
  'node_relations': '연결',
  'triple_sentence_sources': '출처',

  // 파이프라인
  'Layer 1': '처리',
  'Layer 2': '처리',
  'Layer 3': '처리',
  'pipeline': '처리',
  'embedding': '분석',
  'embeddings': '분석',
  'embed_status': '상태',
  'embed_tier': '등급',
  'storage_tier': '등급',

  // LLM 관련
  'token': '사용량',
  'tokens': '사용량',
  'LLM': 'AI',
  'llm': 'AI',
  'prompt': '요청',
  'system prompt': '설정',

  // 온톨로지
  'ontology': '지식 구조',
  'is_a': '일종',
  'part_of': '포함',
  'causes': '영향',
  'derived_from': '유래',
  'related_to': '관련',
  'opposite_of': '반대',
  'requires': '필요',
  'example_of': '예시',
  'involves': '관여',
  'located_at': '위치',
  'occurs_at': '발생',

  // 기타 내부 용어
  'pgvector': '검색',
  'RLS': '보안',
  'Supabase': '서버',
  'cron': '자동',
  'webhook': '알림',
};

// 정규식 패턴: 단어 경계 기반 (긴 것부터 매칭)
const sortedTerms = Object.keys(TERM_MAP).sort((a, b) => b.length - a.length);
const termPattern = new RegExp(
  sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'g'
);

/**
 * 텍스트에서 내부 용어를 일상 용어로 변환
 * API 응답 및 에러 메시지에 적용
 */
export function sanitize(text: string): string {
  return text.replace(termPattern, (match) => TERM_MAP[match] || match);
}

/**
 * API 응답 객체에서 내부 필드명을 안전한 이름으로 변환
 */
const FIELD_RENAMES: Record<string, string | null> = {
  node_id: 'id',
  triple_id: 'relation_id',
  predicate: 'type',
  section_id: 'part_id',
  sentence_id: 'text_id',
  data_node_id: 'data_id',
  // null = 필드 제거
  embed_status: null,
  embed_tier: null,
  storage_tier: null,
  embed_model: null,
  embed_version: null,
  source_level: null,
};

/**
 * 객체의 키를 안전한 이름으로 변환하고, 제거 대상 키는 삭제
 */
export function sanitizeResponse<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key in FIELD_RENAMES) {
      const newKey = FIELD_RENAMES[key];
      if (newKey === null) continue; // 필드 제거
      result[newKey] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 배열의 각 객체를 sanitize
 */
export function sanitizeResponseArray<T extends Record<string, unknown>>(arr: T[]): Record<string, unknown>[] {
  return arr.map(sanitizeResponse);
}
