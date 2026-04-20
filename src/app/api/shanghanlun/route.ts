import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/shanghanlun
 * 상한론 조문 노드 전체 반환 (관리자 노드)
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('data_nodes')
      .select('id, domain, domain_data, created_at')
      .eq('is_admin_node', true)
      .filter('domain_data->>type', 'eq', 'shanghanlun')
      .order('domain_data->>article_number', { ascending: true });

    if (error) {
      console.error('[Shanghanlun] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ nodes: data ?? [], total: data?.length ?? 0 });
  } catch (e) {
    console.error('[Shanghanlun] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
