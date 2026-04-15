import { createClient } from '@/lib/supabase/server';
import { AccuracyClient } from './AccuracyClient';
import { redirect } from 'next/navigation';

export default async function AccuracyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/accuracy');

  const { data: entities } = await supabase
    .from('unresolved_entities')
    .select('id, raw_text, context_snippet, placeholder_node_id')
    .eq('user_id', user.id)
    .eq('resolution_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);

  return <AccuracyClient entities={entities ?? []} />;
}
