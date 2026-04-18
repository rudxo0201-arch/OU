import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { personaId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { personaId } = body;
    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 });
    }

    const { error } = await supabase.from('persona_follows').insert({
      follower_id: user.id,
      persona_id: personaId,
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already following' }, { status: 409 });
      }
      console.error('[Follow] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to follow' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Follow/POST] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { personaId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { personaId } = body;
    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('persona_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('persona_id', personaId);

    if (error) {
      console.error('[Follow/DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Follow/DELETE] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
