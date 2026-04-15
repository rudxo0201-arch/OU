import { createClient } from '@/lib/supabase/server';
import { ChatRoom } from './ChatRoom';
import { notFound, redirect } from 'next/navigation';

export default async function RoomPage({ params }: { params: { roomId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/messages');

  // Verify membership
  const { data: membership } = await supabase
    .from('chat_room_members')
    .select('room_id')
    .eq('room_id', params.roomId)
    .eq('user_id', user.id)
    .single();

  if (!membership) return notFound();

  return <ChatRoom roomId={params.roomId} userId={user.id} />;
}
