import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './SettingsClient';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/settings');

  const [{ data: profile }, { data: subscription }, { count: nodeCount }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, email, avatar_url, bio, handle')
      .eq('id', user.id)
      .single(),
    supabase
      .from('subscriptions')
      .select('plan, token_limit')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('data_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  return (
    <SettingsClient
      profile={profile}
      subscription={subscription}
      nodeCount={nodeCount ?? 0}
    />
  );
}
