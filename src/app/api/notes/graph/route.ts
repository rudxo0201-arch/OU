import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 노트 노드 전부
    const { data: notes, error: ne } = await supabase
      .from('data_nodes')
      .select('id, domain_data')
      .eq('user_id', user.id)
      .eq('domain', 'note')
      .or('system_tags.is.null,system_tags.not.cs.{"archived"}');

    if (ne) return NextResponse.json({ error: ne.message }, { status: 500 });

    const noteIds = (notes ?? []).map((n) => n.id);

    // 노트 간 page_link 관계
    const { data: relations } = noteIds.length
      ? await supabase
          .from('node_relations')
          .select('source_node_id, target_node_id')
          .eq('relation_type', 'page_link')
          .in('source_node_id', noteIds)
          .in('target_node_id', noteIds)
      : { data: [] };

    const nodes = (notes ?? []).map((n) => {
      const dd = (n.domain_data ?? {}) as Record<string, unknown>;
      return {
        id: n.id,
        title: (dd.title as string) || '제목 없음',
        icon:  (dd.icon  as string) || '',
      };
    });

    const edges = (relations ?? []).map((r) => ({
      source: r.source_node_id,
      target: r.target_node_id,
    }));

    return NextResponse.json({ nodes, edges });
  } catch (e) {
    console.error('[notes/graph GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
