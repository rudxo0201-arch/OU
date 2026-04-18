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

    const { data: view } = await supabase
      .from('saved_views')
      .select('*')
      .eq('id', viewId)
      .eq('is_subscribable', true)
      .single();

    if (!view) return NextResponse.json({ error: 'Not subscribable' }, { status: 404 });

    const { error } = await supabase.from('view_members').upsert({
      view_id: viewId,
      user_id: user.id,
      role: 'subscriber',
    });

    if (error) {
      console.error('[Subscribe/POST] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Subscribe/POST] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const { error } = await supabase.from('view_members')
      .delete()
      .eq('view_id', viewId)
      .eq('user_id', user.id)
      .eq('role', 'subscriber');

    if (error) {
      console.error('[Subscribe/DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Subscribe/DELETE] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
