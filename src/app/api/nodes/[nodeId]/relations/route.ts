import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const nodeId = params.nodeId;

    // Fetch relations where this node is source or target
    const [{ data: asSource, error: srcErr }, { data: asTarget, error: tgtErr }] = await Promise.all([
      supabase
        .from('node_relations')
        .select('target_node_id, predicate, data_nodes!node_relations_target_node_id_fkey(id, raw, domain)')
        .eq('source_node_id', nodeId)
        .limit(20),
      supabase
        .from('node_relations')
        .select('source_node_id, predicate, data_nodes!node_relations_source_node_id_fkey(id, raw, domain)')
        .eq('target_node_id', nodeId)
        .limit(20),
    ]);

    if (srcErr || tgtErr) {
      console.error('[Relations] Supabase error:', srcErr?.message || tgtErr?.message);
      return NextResponse.json({ error: 'Failed to load relations' }, { status: 500 });
    }

    const relations: { id: string; raw?: string; domain: string; predicate?: string }[] = [];

    (asSource ?? []).forEach((rel: any) => {
      const n = rel.data_nodes;
      if (n) {
        relations.push({ id: n.id, raw: n.raw, domain: n.domain, predicate: rel.predicate });
      }
    });

    (asTarget ?? []).forEach((rel: any) => {
      const n = rel.data_nodes;
      if (n) {
        relations.push({ id: n.id, raw: n.raw, domain: n.domain, predicate: rel.predicate });
      }
    });

    return NextResponse.json({ relations });
  } catch (e) {
    console.error('[Relations] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
