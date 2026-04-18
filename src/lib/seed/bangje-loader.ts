import type { SupabaseClient } from '@supabase/supabase-js';

/** 방제(처방) 인터페이스 */
export interface Formula {
  id: string;
  name: string;
  hanjaName: string;
  categoryMajor: string;
  categoryMinor: string;
  importance: number;
  composition: {
    herb_name: string;
    herb_hanja: string | null;
    herb_node_id: string | null;
    dosage: string | null;
    role: string | null;
  }[];
  efficacy?: string[];
  indications?: string[];
  source?: string;
  contraindications?: string[];
  modifications?: string[];
  tags?: string[];
  starred?: boolean;
}

/**
 * Supabase data_nodes에서 방제 DataNode를 조회하여
 * Formula 인터페이스로 변환 (그래프뷰 등에서 사용)
 */
export async function loadBangjeFromDB(
  supabase: SupabaseClient,
  options?: { starredOnly?: boolean },
): Promise<Formula[]> {
  const { data: nodes, error } = await supabase
    .from('data_nodes')
    .select('id, domain_data')
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true)
    .order('importance', { ascending: false });

  if (error) {
    console.error('[BangjeLoader] Query failed:', error.message);
    return [];
  }

  const bangjeNodes = (nodes ?? []).filter(
    (n: any) => n.domain_data?.formula_id,
  );

  const formulas: Formula[] = bangjeNodes
    .filter((n: any) => {
      if (options?.starredOnly) return n.domain_data?.starred;
      return true;
    })
    .map((n: any) => {
      const d = n.domain_data;
      return {
        id: d.formula_id,
        name: d.name_korean,
        hanjaName: d.name_hanja ?? '',
        categoryMajor: d.category_major ?? '',
        categoryMinor: d.category_minor ?? '',
        importance: d.starred ? 5 : 3,
        composition: (d.composition ?? []).map((c: any) => ({
          herb_name: c.herb_name,
          herb_hanja: c.herb_hanja ?? null,
          herb_node_id: c.herb_node_id ?? null,
          dosage: c.dosage ?? null,
          role: c.role ?? null,
        })),
        efficacy: d.efficacy ?? undefined,
        indications: d.indications ?? undefined,
        source: d.source ?? undefined,
        contraindications: d.contraindications ?? undefined,
        modifications: d.modifications ?? undefined,
        tags: d.tags ?? undefined,
        starred: d.starred,
      };
    });

  return formulas;
}

/**
 * 방제 통계 조회 (관리자 대시보드용)
 */
export async function getBangjeStats(supabase: SupabaseClient) {
  const { data: nodes } = await supabase
    .from('data_nodes')
    .select('domain_data')
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true);

  const bangjeNodes = (nodes ?? []).filter(
    (n: any) => n.domain_data?.formula_id,
  );

  const total = bangjeNodes.length;
  const starred = bangjeNodes.filter((n: any) => n.domain_data?.starred).length;
  const enriched = bangjeNodes.filter((n: any) => n.domain_data?.enrichment_status === 'enriched').length;
  const pending = bangjeNodes.filter((n: any) => n.domain_data?.enrichment_status === 'pending').length;
  const partial = bangjeNodes.filter((n: any) => n.domain_data?.enrichment_status === 'partial').length;

  return { total, starred, enriched, pending, partial };
}
