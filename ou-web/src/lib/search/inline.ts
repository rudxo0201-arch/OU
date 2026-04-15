import { SupabaseClient } from '@supabase/supabase-js';

interface SearchResult {
  id: string;
  domain: string;
  raw: string;
  created_at: string;
}

/**
 * 인라인 검색 — API 호출 없이 직접 사용자 데이터를 검색
 * 키워드 검색만 수행 (벡터 검색은 비용/속도 이슈로 chat route에서는 키워드만)
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
  // 키워드 추출: 조사/어미 제거, 2글자 이상만
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  const results: SearchResult[] = [];
  const seenIds = new Set<string>();

  // 각 키워드로 검색
  for (const keyword of keywords.slice(0, 3)) {
    let q = supabase
      .from('data_nodes')
      .select('id, domain, raw, created_at')
      .eq('user_id', userId)
      .ilike('raw', `%${keyword}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 관리자 본인이 아니면 admin_internal 노드 제외
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

  // 최신순 정렬, limit 적용
  return results
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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
