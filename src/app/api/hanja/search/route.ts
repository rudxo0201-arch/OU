import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logSearch } from '@/lib/logging/search-log';

// CJK Unicode 범위
const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

function extractHanja(text: string): string[] {
  const matches = text.match(CJK_REGEX);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const q = params.get('q')?.trim() || '';
    const radical = params.get('radical') || '';
    const grade = params.get('grade') || '';
    const strokeMin = params.get('stroke_min') || '';
    const strokeMax = params.get('stroke_max') || '';
    const compType = params.get('comp_type') || '';
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(params.get('limit') || '100')));
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();

    // 한자가 포함된 검색인지 판별
    const hanjaChars = extractHanja(q);
    const isHanjaSearch = hanjaChars.length > 0;
    const isKoreanSearch = !isHanjaSearch && q.length > 0;

    // 기본 쿼리: 한자 타입 노드만
    let query = supabase
      .from('data_nodes')
      .select('id, domain, domain_data, created_at, visibility', { count: 'exact' })
      .eq('is_admin_node', true)
      .eq('domain', 'knowledge')
      .filter('domain_data->>type', 'eq', 'hanja');

    // 검색 조건
    if (isHanjaSearch) {
      // 한자 직접 검색: OR로 개별 char 매칭
      const charFilters = hanjaChars
        .map(c => `domain_data->>char.eq.${c}`)
        .join(',');
      query = query.or(charFilters);
    } else if (isKoreanSearch) {
      query = query.or(
        `domain_data->>hangul_reading.ilike.%${q}%,domain_data->>definition_en.ilike.%${q}%`,
      );
    }

    // 필터 조건
    if (radical) {
      query = query.filter('domain_data->>radical_char', 'eq', radical);
    }

    if (grade) {
      query = query.filter('domain_data->>grade', 'eq', grade);
    }

    if (compType) {
      query = query.filter('domain_data->composition->>type', 'eq', compType);
    }

    // 정렬 (획수 오름차순, 미지정 시 id 순)
    if (!isHanjaSearch) {
      query = query.order('id', { ascending: true });
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    // 검색 로그 (fire-and-forget)
    if (!error && (q || radical || grade || compType)) {
      void logSearch({
        searchContext: 'dictionary',
        query: q,
        filters: { radical, grade, compType, strokeMin, strokeMax },
        resultCount: count ?? 0,
        searchMode: 'server',
        page,
      });
    }

    if (error) {
      console.error('[Hanja Search] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let nodes = data || [];

    // char 기준 중복 제거 (DB에 동일 한자 중복 입력된 경우 대응)
    const seen = new Set<string>();
    nodes = nodes.filter((n: any) => {
      const char = n.domain_data?.char;
      if (!char || seen.has(char)) return false;
      seen.add(char);
      return true;
    });

    // 한자 검색인 경우 입력 순서대로 정렬
    if (isHanjaSearch && nodes.length > 0) {
      const orderMap = new Map(hanjaChars.map((c, i) => [c, i]));
      nodes.sort((a: any, b: any) => {
        const aIdx = orderMap.get(a.domain_data?.char) ?? 999;
        const bIdx = orderMap.get(b.domain_data?.char) ?? 999;
        return aIdx - bIdx;
      });
    }

    return NextResponse.json({
      nodes,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    console.error('[Hanja Search] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
