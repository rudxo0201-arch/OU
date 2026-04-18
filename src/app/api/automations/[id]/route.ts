import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/automations/[id] — 자동화 수정 (활성화/비활성화, 설정 변경)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify ownership
    const { data: node } = await supabase
      .from('data_nodes')
      .select('user_id, domain_data')
      .eq('id', id)
      .eq('domain', 'automation')
      .single();

    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (node.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const currentData = (node.domain_data as Record<string, unknown>) ?? {};
    const updatedData: Record<string, unknown> = { ...currentData, updatedAt: new Date().toISOString() };

    if (body.enabled !== undefined) updatedData.enabled = body.enabled;
    if (body.trigger !== undefined) updatedData.trigger = body.trigger;
    if (body.actions !== undefined) updatedData.actions = body.actions;

    const updatePayload: Record<string, unknown> = {
      domain_data: updatedData,
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updatePayload.title = body.name;

    const { error } = await supabase
      .from('data_nodes')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Automations/PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/automations/[id] — 자동화 삭제 (비활성화 처리)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: node } = await supabase
      .from('data_nodes')
      .select('user_id, domain_data')
      .eq('id', id)
      .eq('domain', 'automation')
      .single();

    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (node.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Soft-delete: mark as disabled and add deleted tag
    const currentData = (node.domain_data as Record<string, unknown>) ?? {};
    const { error } = await supabase
      .from('data_nodes')
      .update({
        domain_data: { ...currentData, enabled: false, deletedAt: new Date().toISOString() },
        tags: ['automation', 'deleted'],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Automations/DELETE]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
