import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/notes/links — 페이지 링크 관계 생성 (node_relations)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sourceId, targetId } = await req.json();
    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'sourceId, targetId required' }, { status: 400 });
    }
    if (sourceId === targetId) {
      return NextResponse.json({ ok: true }); // 자기 자신 링크 무시
    }

    // upsert — 중복 방지
    const { error } = await supabase
      .from('node_relations')
      .upsert(
        { source_node_id: sourceId, target_node_id: targetId, relation_type: 'page_link', weight: 1 },
        { onConflict: 'source_node_id,target_node_id,relation_type' }
      );

    if (error) {
      // unique constraint 충돌은 정상 — 이미 존재
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        console.error('[Notes/links/POST]', error.message);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Notes/links/POST] unexpected:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notes/links — 페이지 링크 관계 삭제
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sourceId, targetId } = await req.json();
    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'sourceId, targetId required' }, { status: 400 });
    }

    await supabase
      .from('node_relations')
      .delete()
      .eq('source_node_id', sourceId)
      .eq('target_node_id', targetId)
      .eq('relation_type', 'page_link');

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Notes/links/DELETE] unexpected:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
