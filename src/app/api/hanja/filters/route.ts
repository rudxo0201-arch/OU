import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const GRADE_ORDER = [
  '8급','준7급','7급','준6급','6급','준5급','5급',
  '준4급','4급','준3급','3급','2급','1급','준1급','특급','준특급','사범',
];

// 캐시: 5분
let filterCache: any = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  try {
    if (filterCache && Date.now() - cacheTime < CACHE_TTL) {
      return NextResponse.json(filterCache);
    }

    const supabase = createAdminClient();

    // 전체 6,000+ 노드 페이지네이션 조회 (Supabase 기본 한도 1000)
    const allData: any[] = [];
    const BATCH = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('data_nodes')
        .select('domain_data')
        .eq('is_admin_node', true)
        .eq('domain', 'knowledge')
        .filter('domain_data->>type', 'eq', 'hanja')
        .range(from, from + BATCH - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < BATCH) break;
      from += BATCH;
    }

    const radicals = new Map<string, number>();
    const grades = new Map<string, number>();
    const charTypes = new Map<string, number>();
    const domains = new Map<string, number>();
    let minStroke = Infinity;
    let maxStroke = 0;

    for (const row of allData) {
      const d = row.domain_data;
      if (!d) continue;

      if (d.radical) {
        radicals.set(d.radical, (radicals.get(d.radical) || 0) + 1);
      }
      if (d.grade) {
        grades.set(d.grade, (grades.get(d.grade) || 0) + 1);
      }
      if (d.char_type) {
        charTypes.set(d.char_type, (charTypes.get(d.char_type) || 0) + 1);
      }
      if (d.domain) {
        domains.set(d.domain, (domains.get(d.domain) || 0) + 1);
      }
      if (d.stroke_count != null) {
        minStroke = Math.min(minStroke, d.stroke_count);
        maxStroke = Math.max(maxStroke, d.stroke_count);
      }
    }

    const result = {
      radicals: Array.from(radicals.entries())
        .map(([char, count]) => ({ char, count }))
        .sort((a, b) => b.count - a.count),
      grades: Array.from(grades.entries())
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => {
          const ai = GRADE_ORDER.indexOf(a.grade);
          const bi = GRADE_ORDER.indexOf(b.grade);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        }),
      charTypes: Array.from(charTypes.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      domains: Array.from(domains.entries())
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count),
      strokeRange: {
        min: minStroke === Infinity ? 1 : minStroke,
        max: maxStroke || 30,
      },
      totalCount: allData.length,
    };

    filterCache = result;
    cacheTime = Date.now();

    return NextResponse.json(result);
  } catch (e) {
    console.error('[Hanja Filters] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
