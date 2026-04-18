import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* ── GET /api/messages/[roomId] ── list messages for room (paginated) */
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roomId } = params;

    // Verify membership
    const { data: membership } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Pagination params
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
    const before = url.searchParams.get('before'); // cursor: created_at ISO string

    let query = supabase
      .from('chat_messages')
      .select('id, room_id, sender_id, content, node_id, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('[Messages GET] Error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Update last_read_at for this user in this room
    await supabase
      .from('chat_room_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    // Return in ascending order for display
    return NextResponse.json({
      messages: (messages ?? []).reverse(),
      hasMore: (messages ?? []).length === limit,
    });
  } catch (e) {
    console.error('[Messages GET] Unexpected:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ── POST /api/messages/[roomId] ── send message to room */
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roomId } = params;

    // Verify membership
    const { data: membership } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const body = await req.json();
    const { content, nodeId } = body;

    if (!content?.trim() && !nodeId) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    // Insert message
    const { data: message, error: msgErr } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content: content?.trim() || null,
        node_id: nodeId || null,
      })
      .select()
      .single();

    if (msgErr || !message) {
      console.error('[Messages POST] Error:', msgErr?.message);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update room's last_message and updated_at
    await supabase
      .from('chat_rooms')
      .update({
        last_message: content?.trim()?.substring(0, 200) || '(첨부)',
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    // Update sender's last_read_at
    await supabase
      .from('chat_room_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    return NextResponse.json({ message });
  } catch (e) {
    console.error('[Messages POST] Unexpected:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
