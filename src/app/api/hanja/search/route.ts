import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logSearch } from '@/lib/logging/search-log';

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
    const charType = params.get('char_type') || '';
    const domain = params.get('domain') || '';
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(params.get('limit') || '100')));
    const offset = (page - 1) * limit;
    const skipCount = params.get('skip_count') === 'true';

    const supabase = createAdminClient();
    const hanjaChars = extractHanja(q);
    const isHanjaSearch = hanjaChars.length > 0;
    const isKoreanSearch = !isHanjaSearch && q.length > 0;

    // ─── count 쿼리 ────────────────────────────────────────────────────────
    let total = 0;
    if (!skipCount) {
      let countQ = supabase
        .from('data_nodes')
        .select('id', { count: 'exact', head: true })
        .eq('is_admin_node', true)
        .eq('domain', 'knowledge')
        .filter('domain_data->>type', 'eq', 'hanja');

      if (isHanjaSearch) {
        const cf = hanjaChars.map(c => `domain_data->>char.eq.${c}`).join(',');
        countQ = countQ.or(cf);
      } else if (isKoreanSearch) {
        countQ = countQ.or(
          `domain_data->>sound.ilike.%${q}%,domain_data->>hun.ilike.%${q}%,domain_data->>meaning.ilike.%${q}%`
        );
      }
      if (radical) countQ = countQ.filter('domain_data->>radical', 'eq', radical);
      if (grade) countQ = countQ.filter('domain_data->>grade', 'eq', grade);
      if (charType) countQ = countQ.filter('domain_data->>char_type', 'eq', charType);
      if (domain) countQ = countQ.filter('domain_data->>domain', 'ilike', `%${domain}%`);

      const { count } = await countQ;
      total = count ?? 0;
    }

    // ─── 데이터 쿼리 ────────────────────────────────────────────────────────
    let dataQ = supabase
      .from('data_nodes')
      .select('id, domain, domain_data, created_at, visibility')
      .eq('is_admin_node', true)
      .eq('domain', 'knowledge')
      .filter('domain_data->>type', 'eq', 'hanja');

    if (isHanjaSearch) {
      const cf = hanjaChars.map(c => `domain_data->>char.eq.${c}`).join(',');
      dataQ = dataQ.or(cf);
    } else if (isKoreanSearch) {
      dataQ = dataQ.or(
        `domain_data->>sound.ilike.%${q}%,domain_data->>hun.ilike.%${q}%,domain_data->>meaning.ilike.%${q}%`
      );
    }
    if (radical) dataQ = dataQ.filter('domain_data->>radical', 'eq', radical);
    if (grade) dataQ = dataQ.filter('domain_data->>grade', 'eq', grade);
    if (charType) dataQ = dataQ.filter('domain_data->>char_type', 'eq', charType);
    if (domain) dataQ = dataQ.filter('domain_data->>domain', 'ilike', `%${domain}%`);
    if (!isHanjaSearch) dataQ = dataQ.order('id', { ascending: true });
    dataQ = dataQ.range(offset, offset + limit - 1);

    const { data, error } = await dataQ;

    if (error) {
      console.error('[Hanja Search] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let nodes = data || [];

    // char 기준 중복 제거
    const seen = new Set<string>();
    nodes = nodes.filter((n: any) => {
      const char = n.domain_data?.char;
      if (!char || seen.has(char)) return false;
      seen.add(char);
      return true;
    });

    if (isHanjaSearch && nodes.length > 0) {
      const orderMap = new Map(hanjaChars.map((c, i) => [c, i]));
      nodes.sort((a: any, b: any) =>
        (orderMap.get(a.domain_data?.char) ?? 999) - (orderMap.get(b.domain_data?.char) ?? 999)
      );
    }

    if (q || radical || grade || charType || domain) {
      void logSearch({
        searchContext: 'dictionary',
        query: q,
        filters: { radical, grade, charType, strokeMin, strokeMax },
        resultCount: total,
        searchMode: 'server',
        page,
      });
    }

    return NextResponse.json({ nodes, total, page, limit });
  } catch (e) {
    console.error('[Hanja Search] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
