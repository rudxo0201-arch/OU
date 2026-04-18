import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** GET /api/nodes/[nodeId]/content — sections + sentences 조회 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { nodeId } = params;

    // 노드 접근 권한 확인 (RLS가 처리하지만 명시적 체크)
    const { data: node } = await supabase
      .from('data_nodes')
      .select('id, user_id, is_admin_node, visibility')
      .eq('id', nodeId)
      .single();

    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // sections + nested sentences 조회
    const { data: sections, error } = await supabase
      .from('sections')
      .select('id, heading, order_idx, sentences(id, text, order_idx)')
      .eq('node_id', nodeId)
      .order('order_idx', { ascending: true });

    if (error) {
      console.error('[Content/GET] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    // sentences도 order_idx 정렬 (Supabase nested select는 별도 정렬 필요)
    const sorted = (sections ?? []).map(s => ({
      ...s,
      sentences: ((s as any).sentences ?? []).sort(
        (a: any, b: any) => a.order_idx - b.order_idx
      ),
    }));

    return NextResponse.json({ sections: sorted });
  } catch (e) {
    console.error('[Content/GET] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
