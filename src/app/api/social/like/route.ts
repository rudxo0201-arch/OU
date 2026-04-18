import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { nodeId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { nodeId } = body;

    if (!nodeId || typeof nodeId !== 'string') {
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
    }

    // 좋아요 = DataNode로 저장 (relation)
    const { error } = await supabase.from('data_nodes').insert({
      user_id: user.id,
      domain: 'relation',
      source_type: 'manual',
      raw: `liked:${nodeId}`,
      visibility: 'private',
      confidence: 'high',
      resolution: 'resolved',
    });

    if (error) {
      console.error('[Like] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to save like' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Like] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
