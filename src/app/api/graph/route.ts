import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { isAdminEmail } = await import('@/lib/auth/roles');
    const userIsAdmin = user.email ? isAdminEmail(user.email) : false;

    // Fetch user's own nodes + all admin nodes (non-archived, limit 2000)
    // member: visible only / admin: all visibility
    let nodesQuery = supabase
      .from('data_nodes')
      .select('id, domain, raw, confidence, created_at, domain_data, is_admin_node')
      .or(`user_id.eq.${user.id},is_admin_node.eq.true`)
      .or('system_tags.is.null,system_tags.not.cs.{"archived"}')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (!userIsAdmin) {
      nodesQuery = nodesQuery.or('visibility.eq.visible,visibility.is.null');
    }

    const { data: nodes, error: nodesErr } = await nodesQuery;

    if (nodesErr) {
      console.error('[Graph] Nodes error:', nodesErr.message);
      return NextResponse.json({ error: 'Failed to load nodes' }, { status: 500 });
    }

    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ nodes: [], edges: [] });
    }

    const nodeIdSet = new Set(nodes.map(n => n.id));

    // Fetch relations — only filter by source, then client-filter target
    // (double .in() with 2000 UUIDs can exceed PostgREST URL limit)
    const { data: rawRelations, error: relErr } = await supabase
      .from('node_relations')
      .select('source_node_id, target_node_id, relation_type, weight')
      .in('source_node_id', Array.from(nodeIdSet))
      .limit(10000);

    if (relErr) {
      console.error('[Graph] Relations error:', relErr.message);
    }

    // Client-side filter: keep only edges where both endpoints exist
    const relations = (rawRelations ?? []).filter(
      r => nodeIdSet.has(r.source_node_id) && nodeIdSet.has(r.target_node_id)
    );
    console.log(`[Graph] nodes=${nodes.length}, rawEdges=${(rawRelations ?? []).length}, filteredEdges=${relations.length}`);

    const graphNodes = nodes.map(n => ({
      id: n.id,
      domain: n.domain,
      label: extractLabel(n),
      raw: n.raw,
      confidence: n.confidence,
      createdAt: n.created_at,
      isAdmin: n.is_admin_node ?? false,
      domainType: n.domain_data?.type ?? null,
      grade: n.domain_data?.grade ?? null,
      herbId: n.domain_data?.herb_id ?? null,
    }));

    const graphEdges = (relations ?? []).map(r => ({
      source: r.source_node_id,
      target: r.target_node_id,
      relationType: r.relation_type,
      weight: r.weight ?? 1,
    }));

    return NextResponse.json({ nodes: graphNodes, edges: graphEdges });
  } catch (e) {
    console.error('[Graph] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function extractLabel(node: {
  raw: string | null;
  domain_data?: Record<string, unknown> | null;
}): string {
  const dd = node.domain_data;
  if (dd) {
    // 한자: char 필드 사용
    if (dd.type === 'hanja' && dd.char) return dd.char as string;
    // 본초: name_korean 사용
    if (dd.herb_id && dd.name_korean) return dd.name_korean as string;
  }
  // fallback: raw 첫 줄
  if (!node.raw) return '';
  const firstLine = node.raw.split('\n')[0];
  return firstLine.length > 30 ? firstLine.slice(0, 30) + '…' : firstLine;
}
