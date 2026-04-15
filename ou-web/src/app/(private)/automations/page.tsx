import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AutomationsPageClient } from './AutomationsPageClient';

export default async function AutomationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/automations');

  const { data: automations } = await supabase
    .from('data_nodes')
    .select('*')
    .eq('user_id', user.id)
    .eq('domain', 'automation')
    .not('tags', 'cs', '{deleted}')
    .order('created_at', { ascending: false });

  return <AutomationsPageClient automations={automations ?? []} />;
}
