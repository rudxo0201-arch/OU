import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { OUFile } from '@/lib/ou-format/types';

const APP_VERSION = '0.1.0';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { nodeIds?: string[]; viewIds?: string[]; exportAll?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { nodeIds, viewIds, exportAll } = body;

    if (!exportAll && (!nodeIds || nodeIds.length === 0) && (!viewIds || viewIds.length === 0)) {
      return NextResponse.json({ error: 'nodeIds, viewIds, or exportAll flag required' }, { status: 400 });
    }

    // Fetch user profile for owner handle
    const { data: profile } = await supabase
      .from('profiles')
      .select('handle')
      .eq('id', user.id)
      .single();

    // Fetch nodes
    let nodesQuery = supabase
      .from('data_nodes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!exportAll && nodeIds && nodeIds.length > 0) {
      nodesQuery = nodesQuery.in('id', nodeIds);
    }

    // Fetch views
    let viewsQuery = supabase
      .from('saved_views')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!exportAll && viewIds && viewIds.length > 0) {
      viewsQuery = viewsQuery.in('id', viewIds);
    }

    const [{ data: nodes, error: nodesErr }, { data: views, error: viewsErr }] = await Promise.all([
      nodesQuery,
      viewsQuery,
    ]);

    if (nodesErr || viewsErr) {
      console.error('[Export] Supabase error:', nodesErr?.message || viewsErr?.message);
      return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
    }

    // Fetch relations for all exported nodes
    const exportedNodeIds = (nodes ?? []).map((n: { id: string }) => n.id);
    let edges: Array<{ source: string; target: string; type: string; weight?: number }> = [];

    if (exportedNodeIds.length > 0) {
      const { data: relations } = await supabase
        .from('node_relations')
        .select('source_node_id, target_node_id, predicate, weight')
        .or(`source_node_id.in.(${exportedNodeIds.join(',')}),target_node_id.in.(${exportedNodeIds.join(',')})`)
        .limit(5000);

      if (relations) {
        // Only include edges where both endpoints are in the export set
        const nodeIdSet = new Set(exportedNodeIds);
        edges = relations
          .filter((r: { source_node_id: string; target_node_id: string }) =>
            nodeIdSet.has(r.source_node_id) && nodeIdSet.has(r.target_node_id)
          )
          .map((r: { source_node_id: string; target_node_id: string; predicate: string; weight?: number }) => ({
            source: r.source_node_id,
            target: r.target_node_id,
            type: r.predicate,
            weight: r.weight ?? undefined,
          }));
      }
    }

    // Fetch triples for exported nodes
    const triplesMap: Record<string, Array<{ subject: string; predicate: string; object: string }>> = {};
    if (exportedNodeIds.length > 0) {
      const { data: triples } = await supabase
        .from('triples')
        .select('node_id, subject, predicate, object')
        .in('node_id', exportedNodeIds)
        .limit(10000);

      if (triples) {
        for (const t of triples as Array<{ node_id: string; subject: string; predicate: string; object: string }>) {
          if (!triplesMap[t.node_id]) triplesMap[t.node_id] = [];
          triplesMap[t.node_id].push({
            subject: t.subject,
            predicate: t.predicate,
            object: t.object,
          });
        }
      }
    }

    const ouFile: OUFile = {
      version: '1.0',
      metadata: {
        owner: profile?.handle ?? user.id,
        language: 'ko',
        created: new Date().toISOString(),
        title: exportAll ? 'Full Export' : 'Partial Export',
        appVersion: APP_VERSION,
      },
      nodes: (nodes ?? []).map((n: {
        id: string;
        domain: string;
        raw: string;
        domain_data?: Record<string, unknown>;
        created_at: string;
      }) => ({
        id: n.id,
        domain: n.domain,
        raw: n.raw ?? '',
        domain_data: n.domain_data,
        triples: triplesMap[n.id] ?? undefined,
        created_at: n.created_at,
      })),
      edges,
      views: (views ?? []).map((v: {
        id: string;
        name: string;
        view_type: string;
        filter_config?: Record<string, unknown>;
        custom_code?: string;
      }) => ({
        id: v.id,
        name: v.name,
        viewType: v.view_type,
        filterConfig: v.filter_config ?? undefined,
        customCode: v.custom_code ?? undefined,
      })),
    };

    const filename = `ou-export-${new Date().toISOString().slice(0, 10)}.ou`;

    return new NextResponse(JSON.stringify(ouFile, null, 2), {
      headers: {
        'Content-Type': 'application/ou+json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error('[Export] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
