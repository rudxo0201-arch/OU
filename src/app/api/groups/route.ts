import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { name?: string; description?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const { data: group, error } = await supabase.from('groups').insert({
      name,
      description,
      owner_id: user.id,
      visibility: 'private',
    }).select().single();

    if (error || !group) {
      console.error('[Groups/POST] Failed to create group:', error?.message);
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'owner',
    });

    return NextResponse.json({ group });
  } catch (e) {
    console.error('[Groups/POST] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: memberships, error } = await supabase
      .from('group_members')
      .select('group_id, role, groups(id, name, description, owner_id)')
      .eq('user_id', user.id);

    if (error) {
      console.error('[Groups/GET] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to load groups' }, { status: 500 });
    }

    return NextResponse.json({ groups: memberships ?? [] });
  } catch (e) {
    console.error('[Groups/GET] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
