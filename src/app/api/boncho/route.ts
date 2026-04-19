import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/boncho
 * 본초 herb + formula 노드 전체 반환 (관리자 노드)
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('data_nodes')
      .select('id, domain, domain_data, created_at')
      .eq('is_admin_node', true)
      .eq('domain', 'knowledge')
      .or('domain_data->>herb_id.not.is.null,domain_data->>formula_id.not.is.null')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Boncho] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ nodes: data ?? [], total: data?.length ?? 0 });
  } catch (e) {
    console.error('[Boncho] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
