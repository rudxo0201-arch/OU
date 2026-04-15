import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** PATCH /api/annotations/[annotationId] — 어노테이션 수정 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { annotationId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 소유권 확인 + 현재 상태 스냅샷
    const { data: existing } = await supabase
      .from('annotations')
      .select('*')
      .eq('id', params.annotationId)
      .single();

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let body: { note_text?: string; color?: string; importance?: number; position?: any };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.note_text !== undefined) updatePayload.note_text = body.note_text;
    if (body.color !== undefined) updatePayload.color = body.color;
    if (body.importance !== undefined) updatePayload.importance = body.importance;
    if (body.position !== undefined) updatePayload.position = body.position;

    const { error } = await supabase
      .from('annotations')
      .update(updatePayload)
      .eq('id', params.annotationId);

    if (error) {
      console.error('[Annotations/PATCH] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    // 이벤트 기록
    await supabase.from('annotation_events').insert({
      annotation_id: params.annotationId,
      user_id: user.id,
      event_type: 'updated',
      previous_state: existing,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Annotations/PATCH] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/annotations/[annotationId] — 소프트 삭제 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { annotationId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 소유권 확인
    const { data: existing } = await supabase
      .from('annotations')
      .select('user_id')
      .eq('id', params.annotationId)
      .single();

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 소프트 삭제
    const { error } = await supabase
      .from('annotations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.annotationId);

    if (error) {
      console.error('[Annotations/DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    // 이벤트 기록
    await supabase.from('annotation_events').insert({
      annotation_id: params.annotationId,
      user_id: user.id,
      event_type: 'deleted',
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Annotations/DELETE] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
