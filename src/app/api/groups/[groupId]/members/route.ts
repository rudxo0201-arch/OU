import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check caller is a member
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', params.groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    const { data: members, error } = await supabase
      .from('group_members')
      .select('user_id, role, joined_at, profiles(display_name, avatar_url)')
      .eq('group_id', params.groupId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('[GroupMembers/GET] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
    }

    return NextResponse.json({ members });
  } catch (e) {
    console.error('[GroupMembers/GET] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', params.groupId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already a member' }, { status: 409 });
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: params.groupId,
      user_id: user.id,
      role: 'member',
    });

    if (error) {
      console.error('[GroupMembers/POST] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[GroupMembers/POST] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only owner can remove members
    const { data: callerMembership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', params.groupId)
      .eq('user_id', user.id)
      .single();

    if (!callerMembership || callerMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only group owner can remove members' }, { status: 403 });
    }

    let body: { userId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Prevent owner from removing themselves
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself as owner' }, { status: 400 });
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', params.groupId)
      .eq('user_id', userId);

    if (error) {
      console.error('[GroupMembers/DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[GroupMembers/DELETE] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
