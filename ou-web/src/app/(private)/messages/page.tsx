import { createClient } from '@/lib/supabase/server';
import { MessagesClient } from './MessagesClient';
import { redirect } from 'next/navigation';

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/messages');

  return <MessagesClient userId={user.id} />;
}
