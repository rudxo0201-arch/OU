import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { viewId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { viewId } = body;
    if (!viewId) return NextResponse.json({ error: 'viewId is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('saved_views')
      .update({ is_subscribable: true, visibility: 'public' })
      .eq('id', viewId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[Publish] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to publish view' }, { status: 500 });
    }

    return NextResponse.json({ view: data });
  } catch (e) {
    console.error('[Publish] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
