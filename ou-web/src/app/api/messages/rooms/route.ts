import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* ── GET /api/messages/rooms ── list rooms for current user with last message & other member info */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Get rooms I belong to
    const { data: memberships } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ rooms: [] });
    }

    const roomIds = memberships.map(m => m.room_id);

    // 2. Get room details
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('id, name, last_message, updated_at, created_at')
      .in('id', roomIds)
      .order('updated_at', { ascending: false });

    // 3. Get all members of these rooms (to show the other person)
    const { data: allMembers } = await supabase
      .from('chat_room_members')
      .select('room_id, user_id, last_read_at')
      .in('room_id', roomIds);

    // 4. Collect other user IDs to fetch profiles
    const otherUserIds = new Set<string>();
    const myMembershipMap: Record<string, { last_read_at: string | null }> = {};
    for (const m of allMembers ?? []) {
      if (m.user_id === user.id) {
        myMembershipMap[m.room_id] = { last_read_at: m.last_read_at };
      } else {
        otherUserIds.add(m.user_id);
      }
    }

    // 5. Fetch profiles for other members
    let profileMap: Record<string, { display_name: string | null; avatar_url: string | null; handle: string | null }> = {};
    if (otherUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, handle')
        .in('id', Array.from(otherUserIds));
      for (const p of profiles ?? []) {
        profileMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url, handle: p.handle };
      }
    }

    // 6. Count unread messages per room
    const enrichedRooms = (rooms ?? []).map(room => {
      // Find the other member(s)
      const otherMembers = (allMembers ?? [])
        .filter(m => m.room_id === room.id && m.user_id !== user.id)
        .map(m => ({
          user_id: m.user_id,
          ...profileMap[m.user_id],
        }));

      const myMembership = myMembershipMap[room.id];
      // Simple unread: messages after last_read_at
      let unread_count = 0;
      if (myMembership?.last_read_at && room.updated_at) {
        unread_count = new Date(room.updated_at) > new Date(myMembership.last_read_at) ? 1 : 0;
      } else if (!myMembership?.last_read_at && room.last_message) {
        unread_count = 1;
      }

      return {
        id: room.id,
        name: room.name,
        last_message: room.last_message,
        updated_at: room.updated_at,
        created_at: room.created_at,
        other_members: otherMembers,
        unread_count,
      };
    });

    return NextResponse.json({ rooms: enrichedRooms });
  } catch (e) {
    console.error('[Rooms GET] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ── POST /api/messages/rooms ── create room + add members */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let targetUserId: string | undefined;
    try {
      const body = await req.json();
      targetUserId = body.targetUserId;
    } catch {
      // No body is fine — creates solo room like before
    }

    // If target user specified, check for existing 1:1 room
    if (targetUserId) {
      const { data: myRooms } = await supabase
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', user.id);

      if (myRooms && myRooms.length > 0) {
        const roomIds = myRooms.map(r => r.room_id);
        const { data: sharedMemberships } = await supabase
          .from('chat_room_members')
          .select('room_id')
          .eq('user_id', targetUserId)
          .in('room_id', roomIds);

        if (sharedMemberships && sharedMemberships.length > 0) {
          // Return existing room
          return NextResponse.json({ roomId: sharedMemberships[0].room_id });
        }
      }
    }

    // Create new room
    const { data: room, error: roomErr } = await supabase
      .from('chat_rooms')
      .insert({})
      .select()
      .single();

    if (roomErr || !room) {
      console.error('[Rooms] Failed to create room:', roomErr?.message);
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }

    // Add creator as member
    await supabase.from('chat_room_members').insert({
      room_id: room.id,
      user_id: user.id,
    });

    // Add target user as member if specified
    if (targetUserId) {
      await supabase.from('chat_room_members').insert({
        room_id: room.id,
        user_id: targetUserId,
      });
    }

    return NextResponse.json({ roomId: room.id });
  } catch (e) {
    console.error('[Rooms] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
