import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { raw?: string; domain_data?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { raw, domain_data } = body;

    // Verify ownership
    const { data: node } = await supabase
      .from('data_nodes')
      .select('user_id')
      .eq('id', params.nodeId)
      .single();

    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (node.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (raw !== undefined) updatePayload.raw = raw;
    if (domain_data !== undefined) updatePayload.domain_data = domain_data;

    const { error } = await supabase
      .from('data_nodes')
      .update(updatePayload)
      .eq('id', params.nodeId);

    if (error) {
      console.error('[Nodes/PATCH] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Nodes/PATCH] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Soft delete (archive) — sets visibility to 'private' and marks as archived
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify ownership
    const { data: node } = await supabase
      .from('data_nodes')
      .select('user_id')
      .eq('id', params.nodeId)
      .single();

    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (node.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Soft delete: set visibility to private and store archived flag in domain_data
    const { error } = await supabase
      .from('data_nodes')
      .update({
        visibility: 'private',
        system_tags: ['archived'],
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.nodeId);

    if (error) {
      console.error('[Nodes/DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to archive' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Nodes/DELETE] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
