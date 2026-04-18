import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

interface SearchResult {
  id: string;
  domain: string;
  raw: string;
  created_at: string;
  similarity?: number;
}

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

/**
 * 인라인 검색 — 하이브리드: 키워드 + 시맨틱(벡터) 검색
 *
 * 1. 키워드 검색 (ilike) — 즉시, 비용 0
 * 2. 시맨틱 검색 (pgvector) — 의미적 매칭, ~$0.00002/query
 * 3. 결과 병합 + 중복 제거 + 최신순 정렬
 *
 * 시맨틱 검색 실패 시 키워드 결과만 반환 (graceful degradation)
 *
 * @param includeAdminInternal - true면 _admin_internal 노드도 포함 (관리자 본인 조회 시)
 */
export async function searchUserData(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit = 5,
  includeAdminInternal = false,
): Promise<SearchResult[]> {
  const keywords = extractKeywords(query);
  const results: SearchResult[] = [];
  const seenIds = new Set<string>();

  // ── 1. 키워드 검색 (비용 0) ──
  if (keywords.length > 0) {
    for (const keyword of keywords.slice(0, 3)) {
      let q = supabase
        .from('data_nodes')
        .select('id, domain, raw, created_at')
        .eq('user_id', userId)
        .ilike('raw', `%${keyword}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!includeAdminInternal) {
        q = q.not('domain_data->>_admin_internal', 'eq', 'true');
      }

      const { data } = await q;
      if (data) {
        for (const row of data) {
          if (!seenIds.has(row.id)) {
            seenIds.add(row.id);
            results.push(row);
          }
        }
      }
    }
  }

  // ── 2. 시맨틱 검색 (벡터) ──
  try {
    const openai = getOpenAI();
    if (openai && query.trim().length >= 2) {
      const embRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });
      const queryEmbedding = embRes.data[0].embedding;

      const { data: vectorResults } = await supabase.rpc('match_sentences', {
        query_embedding: queryEmbedding,
        match_threshold: 0.65,
        match_count: limit * 2,
        p_user_id: userId,
      });

      if (vectorResults) {
        // 벡터 결과에서 node_id로 노드 정보 가져오기
        const vectorNodeIds = (vectorResults as { node_id: string; similarity: number }[])
          .filter(r => !seenIds.has(r.node_id))
          .map(r => ({ node_id: r.node_id, similarity: r.similarity }));

        if (vectorNodeIds.length > 0) {
          const { data: nodes } = await supabase
            .from('data_nodes')
            .select('id, domain, raw, created_at')
            .in('id', vectorNodeIds.map(v => v.node_id))
            .eq('user_id', userId);

          if (nodes) {
            const simMap = new Map(vectorNodeIds.map(v => [v.node_id, v.similarity]));
            for (const node of nodes) {
              if (!seenIds.has(node.id)) {
                seenIds.add(node.id);
                results.push({ ...node, similarity: simMap.get(node.id) });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // 시맨틱 검색 실패 시 키워드 결과만 사용 (graceful degradation)
    console.warn('[Search/inline] Semantic search unavailable:', (e as Error).message);
  }

  // 시맨틱 유사도가 있는 결과를 우선, 나머지는 최신순
  return results
    .sort((a, b) => {
      if (a.similarity && b.similarity) return b.similarity - a.similarity;
      if (a.similarity) return -1;
      if (b.similarity) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);
}

/**
 * 질문 감지: ?가 있거나, 의문사로 시작하는 경우
 */
export function isQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.includes('?') || trimmed.includes('？')) return true;
  // 의문사 패턴
  if (/^(뭐|뭔|무엇|언제|어디|누구|누가|왜|어떻게|얼마|몇|어떤|무슨)/.test(trimmed)) return true;
  // 문장 중간/끝의 의문 표현
  if (/(뭐야|뭐지|뭐였|뭘까|언제야|어디야|누구야|왜야|어때|있어|했어|할까|인가|인지|나요|가요|까요|죠)\s*$/.test(trimmed)) return true;
  return false;
}

/**
 * 키워드 추출 — 질문에서 검색할 핵심 단어 추출
 */
function extractKeywords(text: string): string[] {
  // 의문사, 조사, 일반적인 불용어 제거
  const stopwords = new Set([
    '뭐', '뭔', '무엇', '언제', '어디', '누구', '누가', '왜', '어떻게', '얼마', '몇',
    '어떤', '무슨', '이', '그', '저', '것', '거', '건', '들', '좀', '잘', '더',
    '나', '내', '저', '제', '우리', '너', '니', '당신',
    '은', '는', '이', '가', '을', '를', '에', '에서', '으로', '로', '와', '과', '의',
    '하다', '있다', '없다', '되다', '아니다', '같다',
    '했어', '했나', '있어', '없어', '했는지', '인지', '건지',
    '알려줘', '말해줘', '가르쳐줘', '보여줘',
  ]);

  const words = text
    .replace(/[?？!.，,。]/g, '')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !stopwords.has(w));

  return words;
}

/**
 * 관리자 DB 검색 — 본초/방제/한자/상한론 등 관리자 구축 데이터에서 검색
 * 비용 0원 (DB 쿼리만)
 */
export async function searchAdminData(
  supabase: SupabaseClient,
  query: string,
  limit = 5,
): Promise<{ results: string[]; sources: string[] }> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return { results: [], sources: [] };

  const results: string[] = [];
  const sources: string[] = [];
  const seenIds = new Set<string>();

  for (const keyword of keywords.slice(0, 3)) {
    const { data } = await supabase
      .from('data_nodes')
      .select('id, raw, domain_data, confidence')
      .eq('is_admin_node', true)
      .eq('visibility', 'public')
      .ilike('raw', `%${keyword}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (data) {
      for (const row of data) {
        if (seenIds.has(row.id)) continue;
        seenIds.add(row.id);

        const type = row.domain_data?.type || row.domain_data?.herb_id ? 'boncho' : 'unknown';
        const confidence = row.confidence || 'medium';
        const raw = (row.raw || '').slice(0, 300);

        results.push(`[${type}/${confidence}] ${raw}`);
        sources.push(type);
      }
    }
  }

  return {
    results: results.slice(0, limit),
    sources: Array.from(new Set(sources)),
  };
}

/**
 * 사용자의 도메인별 데이터 개수 조회
 */
export async function getUserDataCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<{ counts: Record<string, number>; total: number }> {
  const { data } = await supabase
    .from('data_nodes')
    .select('domain')
    .eq('user_id', userId);

  if (!data || data.length === 0) {
    return { counts: {}, total: 0 };
  }

  const counts: Record<string, number> = {};
  for (const row of data) {
    const d = row.domain || 'unknown';
    counts[d] = (counts[d] || 0) + 1;
  }

  return { counts, total: data.length };
}
