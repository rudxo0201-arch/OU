import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST: 시나리오 실현 보고 생성
 * GET:  시나리오별 실현 이야기 조회 (public)
 */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { scenarioNodeId?: string; story?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { scenarioNodeId, story } = body;

    if (!scenarioNodeId || typeof scenarioNodeId !== 'string') {
      return NextResponse.json({ error: 'scenarioNodeId is required' }, { status: 400 });
    }
    if (!story || typeof story !== 'string' || !story.trim()) {
      return NextResponse.json({ error: 'story is required' }, { status: 400 });
    }

    // Fetch the scenario node to get its title
    const { data: scenarioNode, error: scenarioErr } = await supabase
      .from('data_nodes')
      .select('id, title, raw')
      .eq('id', scenarioNodeId)
      .single();

    if (scenarioErr || !scenarioNode) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const scenarioTitle = scenarioNode.title || (scenarioNode.raw?.slice(0, 60) ?? '');

    // Create the realization DataNode
    const { data: realizationNode, error: nodeError } = await supabase
      .from('data_nodes')
      .insert({
        user_id: user.id,
        domain: 'broadcast',
        source_type: 'manual',
        title: `${scenarioTitle} - 실현 이야기`,
        raw: story.trim(),
        domain_data: {
          type: 'realization',
          scenario_node_id: scenarioNodeId,
          scenario_title: scenarioTitle,
        },
        visibility: 'public',
        confidence: 1.0,
        resolution: 'resolved',
      })
      .select('id, title, raw, created_at, domain_data')
      .single();

    if (nodeError || !realizationNode) {
      console.error('[Realize] Failed to create realization node:', nodeError?.message);
      return NextResponse.json({ error: 'Failed to create realization' }, { status: 500 });
    }

    // Create node_relation: realization -> scenario (realized)
    const { error: relationError } = await supabase
      .from('node_relations')
      .insert({
        source_node_id: realizationNode.id,
        target_node_id: scenarioNodeId,
        relation_type: 'realized',
      });

    if (relationError) {
      console.error('[Realize] Failed to create relation:', relationError.message);
      // Non-fatal: the node was still created
    }

    return NextResponse.json({ success: true, node: realizationNode });
  } catch (e) {
    console.error('[Realize] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
    }

    // Fetch realization nodes linked to this scenario
    const { data: relations, error: relErr } = await supabase
      .from('node_relations')
      .select('source_node_id')
      .eq('target_node_id', scenarioId)
      .eq('relation_type', 'realized');

    if (relErr) {
      console.error('[Realize/GET] Relation query error:', relErr.message);
      return NextResponse.json({ error: 'Failed to load realizations' }, { status: 500 });
    }

    const nodeIds = (relations ?? []).map((r: any) => r.source_node_id);

    if (nodeIds.length === 0) {
      return NextResponse.json({ realizations: [], count: 0 });
    }

    // Fetch the actual nodes with author profiles
    const { data: nodes, error: nodesErr } = await supabase
      .from('data_nodes')
      .select('id, title, raw, created_at, user_id, domain_data, profiles(id, display_name, avatar_url, handle)')
      .in('id', nodeIds)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (nodesErr) {
      console.error('[Realize/GET] Nodes query error:', nodesErr.message);
      return NextResponse.json({ error: 'Failed to load realization data' }, { status: 500 });
    }

    const normalized = (nodes ?? []).map((n: any) => ({
      ...n,
      profiles: Array.isArray(n.profiles) ? n.profiles[0] ?? null : n.profiles,
    }));

    return NextResponse.json({
      realizations: normalized,
      count: normalized.length,
    });
  } catch (e) {
    console.error('[Realize/GET] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
