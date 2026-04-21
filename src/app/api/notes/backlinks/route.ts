import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/notes/backlinks?targetId=xxx — 이 페이지를 참조하는 페이지 목록
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const targetId = req.nextUrl.searchParams.get('targetId');
    if (!targetId) return NextResponse.json({ error: 'targetId required' }, { status: 400 });

    const { data, error } = await supabase
      .from('node_relations')
      .select(`
        source_node_id,
        data_nodes!node_relations_source_node_id_fkey (
          id, domain_data
        )
      `)
      .eq('target_node_id', targetId)
      .eq('relation_type', 'page_link');

    if (error) {
      console.error('[Backlinks/GET]', error.message);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    const backlinks = (data ?? [])
      .map((r: any) => {
        const n = r.data_nodes;
        if (!n) return null;
        return {
          id: n.id,
          title: n.domain_data?.title ?? '제목 없음',
        };
      })
      .filter(Boolean);

    return NextResponse.json({ backlinks });
  } catch (e) {
    console.error('[Backlinks/GET] unexpected:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
