import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { entityId?: string; resolvedValue?: string; nodeId?: string; skip?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { entityId, resolvedValue, nodeId, skip } = body;

    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: entity } = await supabase
      .from('unresolved_entities')
      .select('id, user_id, placeholder_node_id')
      .eq('id', entityId)
      .eq('user_id', user.id)
      .single();

    if (!entity) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (skip) {
      // Mark as skipped
      const { error } = await supabase
        .from('unresolved_entities')
        .update({
          resolution_status: 'skipped',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      if (error) {
        console.error('[Accuracy/Resolve] Skip error:', error.message);
        return NextResponse.json({ error: 'Failed to skip entity' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'skipped' });
    }

    if (!resolvedValue) {
      return NextResponse.json({ error: 'resolvedValue is required' }, { status: 400 });
    }

    // Update entity as resolved
    const { error: updateError } = await supabase
      .from('unresolved_entities')
      .update({
        resolution_status: 'manual',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', entityId);

    if (updateError) {
      console.error('[Accuracy/Resolve] Update error:', updateError.message);
      return NextResponse.json({ error: 'Failed to resolve entity' }, { status: 500 });
    }

    // If there's a linked data_node, update its domain_data with the resolved value
    const targetNodeId = nodeId ?? entity.placeholder_node_id;
    if (targetNodeId) {
      const { data: node } = await supabase
        .from('data_nodes')
        .select('domain_data')
        .eq('id', targetNodeId)
        .eq('user_id', user.id)
        .single();

      if (node) {
        const domainData = (node.domain_data as Record<string, unknown>) ?? {};
        const resolvedEntities = (domainData.resolved_entities as Record<string, string>) ?? {};
        resolvedEntities[entityId] = resolvedValue;

        await supabase
          .from('data_nodes')
          .update({
            domain_data: { ...domainData, resolved_entities: resolvedEntities },
          })
          .eq('id', targetNodeId);
      }
    }

    return NextResponse.json({ success: true, status: 'resolved' });
  } catch (e) {
    console.error('[Accuracy/Resolve] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
