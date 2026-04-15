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

    let body: { visibility?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { visibility } = body;

    if (!visibility || !['private', 'link', 'public'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
    }

    // Verify ownership
    const { data: node } = await supabase
      .from('data_nodes')
      .select('user_id, domain_data')
      .eq('id', params.nodeId)
      .single();

    if (!node) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (node.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 운영 데이터는 비공개 고정
    const domainData = (node.domain_data ?? {}) as Record<string, any>;
    if (domainData._visibility_locked) {
      return NextResponse.json(
        { error: '운영 데이터는 비공개로 고정됩니다' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('data_nodes')
      .update({ visibility })
      .eq('id', params.nodeId);

    if (error) {
      console.error('[Visibility] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Visibility] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
