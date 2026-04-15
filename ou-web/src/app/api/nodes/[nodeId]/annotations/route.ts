import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** GET /api/nodes/[nodeId]/annotations — 해당 노드의 어노테이션 조회 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: annotations, error } = await supabase
      .from('annotations')
      .select('*, annotation_sentence_targets(sentence_id)')
      .eq('node_id', params.nodeId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Annotations/GET] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json({ annotations: annotations ?? [] });
  } catch (e) {
    console.error('[Annotations/GET] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/nodes/[nodeId]/annotations — 어노테이션 생성 */
export async function POST(
  req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: {
      type: string;
      selected_text?: string;
      note_text?: string;
      color?: string;
      position?: any;
      section_id?: string;
      importance?: number;
      sentence_ids?: string[];
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { type, selected_text, note_text, color, position, section_id, importance, sentence_ids } = body;

    if (!type || !['highlight', 'note', 'bookmark', 'canvas'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // 어노테이션 생성
    const { data: annotation, error } = await supabase
      .from('annotations')
      .insert({
        user_id: user.id,
        node_id: params.nodeId,
        section_id: section_id ?? null,
        type,
        selected_text: selected_text ?? null,
        note_text: note_text ?? null,
        color: color ?? 'gray-3',
        position: position ?? null,
        importance: importance ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[Annotations/POST] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }

    // sentence 매핑 (N:M)
    if (sentence_ids && sentence_ids.length > 0 && annotation) {
      const targets = sentence_ids.map(sid => ({
        annotation_id: annotation.id,
        sentence_id: sid,
      }));

      const { error: targetError } = await supabase
        .from('annotation_sentence_targets')
        .insert(targets);

      if (targetError) {
        console.error('[Annotations/POST] Targets error:', targetError.message);
      }
    }

    // 이벤트 기록
    if (annotation) {
      await supabase.from('annotation_events').insert({
        annotation_id: annotation.id,
        user_id: user.id,
        event_type: 'created',
        metadata: { type, color },
      });
    }

    return NextResponse.json({ annotation }, { status: 201 });
  } catch (e) {
    console.error('[Annotations/POST] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
