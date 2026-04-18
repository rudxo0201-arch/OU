import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch user's data nodes (non-archived, limit 200)
    const { data: nodes, error: nodesErr } = await supabase
      .from('data_nodes')
      .select('id, domain, raw, confidence, created_at')
      .eq('user_id', user.id)
      .not('system_tags', 'cs', '{"archived"}')
      .order('created_at', { ascending: false })
      .limit(200);

    if (nodesErr) {
      console.error('[Graph] Nodes error:', nodesErr.message);
      return NextResponse.json({ error: 'Failed to load nodes' }, { status: 500 });
    }

    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ nodes: [], edges: [] });
    }

    const nodeIds = nodes.map(n => n.id);

    // Fetch relations between these nodes
    const { data: relations, error: relErr } = await supabase
      .from('node_relations')
      .select('source_node_id, target_node_id, predicate, weight')
      .in('source_node_id', nodeIds)
      .in('target_node_id', nodeIds)
      .limit(500);

    if (relErr) {
      console.error('[Graph] Relations error:', relErr.message);
    }

    const graphNodes = nodes.map(n => ({
      id: n.id,
      domain: n.domain,
      label: truncateLabel(n.raw),
      confidence: n.confidence,
      createdAt: n.created_at,
    }));

    const graphEdges = (relations ?? []).map(r => ({
      source: r.source_node_id,
      target: r.target_node_id,
      predicate: r.predicate,
      weight: r.weight ?? 1,
    }));

    return NextResponse.json({ nodes: graphNodes, edges: graphEdges });
  } catch (e) {
    console.error('[Graph] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function truncateLabel(raw: string | null): string {
  if (!raw) return '';
  const firstLine = raw.split('\n')[0];
  return firstLine.length > 30 ? firstLine.slice(0, 30) + '…' : firstLine;
}
