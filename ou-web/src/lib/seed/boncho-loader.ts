import type { SupabaseClient } from '@supabase/supabase-js';

/** Boncho 인터페이스 (ou-design-system/types/boncho.ts와 동일) */
export interface Boncho {
  id: string;
  name: string;
  hanjaName: string;
  categoryMajor: string;
  categoryMinor: string;
  importance: number;
  channelTropism: string[];
  relatedHerbs: string[];
  nature?: string[];
  flavor?: string[];
  efficacy?: string[];
  indications?: string[];
  description?: string;
  starred?: boolean;
}

/**
 * Supabase data_nodes에서 본초 DataNode를 조회하여
 * Boncho 인터페이스로 변환 (그래프뷰 등에서 사용)
 */
export async function loadBonchoFromDB(
  supabase: SupabaseClient,
  options?: { starredOnly?: boolean },
): Promise<Boncho[]> {
  const { data: nodes, error } = await supabase
    .from('data_nodes')
    .select('id, domain_data')
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true)
    .order('importance', { ascending: false });

  if (error) {
    console.error('[BonchoLoader] Query failed:', error.message);
    return [];
  }

  const bonchoNodes = (nodes ?? []).filter(
    (n: any) => n.domain_data?.herb_id,
  );

  const herbs: Boncho[] = bonchoNodes
    .filter((n: any) => {
      if (options?.starredOnly) return n.domain_data?.starred;
      return true;
    })
    .map((n: any) => {
      const d = n.domain_data;
      return {
        id: d.herb_id,
        name: d.name_korean,
        hanjaName: d.name_hanja ?? '',
        categoryMajor: d.category_major ?? '',
        categoryMinor: d.category_minor ?? '',
        importance: d.starred ? 5 : 3,
        channelTropism: d.channel_tropism ?? [],
        relatedHerbs: [],
        nature: d.nature ?? undefined,
        flavor: d.flavor ?? undefined,
        efficacy: d.efficacy ?? undefined,
        indications: d.indications ?? undefined,
        description: d.description ?? undefined,
        starred: d.starred,
      };
    });

  return herbs;
}

/**
 * 본초 통계 조회 (관리자 대시보드용)
 */
export async function getBonchoStats(supabase: SupabaseClient) {
  const { data: nodes } = await supabase
    .from('data_nodes')
    .select('domain_data')
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true);

  const bonchoNodes = (nodes ?? []).filter(
    (n: any) => n.domain_data?.herb_id,
  );

  const total = bonchoNodes.length;
  const starred = bonchoNodes.filter((n: any) => n.domain_data?.starred).length;
  const enriched = bonchoNodes.filter((n: any) => n.domain_data?.enrichment_status === 'enriched').length;
  const pending = bonchoNodes.filter((n: any) => n.domain_data?.enrichment_status === 'pending').length;
  const partial = bonchoNodes.filter((n: any) => n.domain_data?.enrichment_status === 'partial').length;

  return { total, starred, enriched, pending, partial };
}
