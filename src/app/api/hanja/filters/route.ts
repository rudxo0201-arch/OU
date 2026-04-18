import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// 캐시: 5분
let filterCache: any = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  try {
    // 캐시 반환
    if (filterCache && Date.now() - cacheTime < CACHE_TTL) {
      return NextResponse.json(filterCache);
    }

    const supabase = createAdminClient();

    // 전체 한자 노드에서 필터 옵션 추출
    // 집계를 위해 최소 필드만 가져옴
    const { data, error } = await supabase
      .from('data_nodes')
      .select('domain_data')
      .eq('is_admin_node', true)
      .eq('domain', 'knowledge')
      .filter('domain_data->>type', 'eq', 'hanja')
      .not('domain_data->>radical_char', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const radicals = new Map<string, { count: number; name: string }>();
    const grades = new Map<number, number>();
    const compositionTypes = new Map<string, number>();
    let minStroke = Infinity;
    let maxStroke = 0;

    for (const row of data || []) {
      const d = row.domain_data;
      if (!d) continue;

      // 부수
      if (d.radical_char) {
        const existing = radicals.get(d.radical_char);
        if (existing) {
          existing.count++;
        } else {
          radicals.set(d.radical_char, {
            count: 1,
            name: d.radical_name_ko || '',
          });
        }
      }

      // 급수
      if (d.grade != null) {
        grades.set(d.grade, (grades.get(d.grade) || 0) + 1);
      }

      // 구성원리
      if (d.composition?.type) {
        compositionTypes.set(
          d.composition.type,
          (compositionTypes.get(d.composition.type) || 0) + 1,
        );
      }

      // 획수 범위
      if (d.stroke_count != null) {
        minStroke = Math.min(minStroke, d.stroke_count);
        maxStroke = Math.max(maxStroke, d.stroke_count);
      }
    }

    const result = {
      radicals: Array.from(radicals.entries())
        .map(([char, info]) => ({ char, name: info.name, count: info.count }))
        .sort((a, b) => b.count - a.count),
      grades: Array.from(grades.entries())
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => a.grade - b.grade),
      compositionTypes: Array.from(compositionTypes.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      strokeRange: {
        min: minStroke === Infinity ? 1 : minStroke,
        max: maxStroke || 30,
      },
      totalCount: (data || []).length,
    };

    // 캐시 저장
    filterCache = result;
    cacheTime = Date.now();

    return NextResponse.json(result);
  } catch (e) {
    console.error('[Hanja Filters] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
