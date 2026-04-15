import { createClient } from '@/lib/supabase/server';
import { FeedClient } from './FeedClient';
import { redirect } from 'next/navigation';

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/feed');

  const { data: feedNodes } = await supabase
    .from('data_nodes')
    .select('*, profiles(id, display_name, avatar_url)')
    .eq('visibility', 'public')
    .not('domain_data->>_admin_internal', 'eq', 'true')
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  // Fetch default persona handles for profile linking
  const userIds = Array.from(new Set((feedNodes ?? []).map((n: any) => n.user_id).filter(Boolean)));
  let handleMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: personas } = await supabase
      .from('personas')
      .select('user_id, handle')
      .in('user_id', userIds)
      .eq('is_default', true);
    (personas ?? []).forEach((p: any) => {
      handleMap[p.user_id] = p.handle;
    });
  }

  // Attach handle to each feed node
  const enrichedNodes = (feedNodes ?? []).map((n: any) => ({
    ...n,
    author_handle: handleMap[n.user_id] ?? null,
  }));

  return <FeedClient nodes={enrichedNodes} userId={user.id} />;
}
