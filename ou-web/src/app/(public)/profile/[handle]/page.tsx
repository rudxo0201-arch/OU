import { createClient } from '@/lib/supabase/server';
import { ProfileClient } from './ProfileClient';
import { notFound } from 'next/navigation';

export default async function ProfilePage({ params }: { params: { handle: string } }) {
  const supabase = await createClient();

  // personas 테이블이 없을 수 있으므로 profiles로 fallback
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', params.handle)
    .single();

  if (!profile) return notFound();

  const { data: nodesRaw } = await supabase
    .from('data_nodes')
    .select('*')
    .eq('user_id', profile.id)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(50);

  const nodes = nodesRaw ?? [];

  // Total node count for rank badge
  const { count: totalNodeCount } = await supabase
    .from('data_nodes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id);

  return (
    <ProfileClient
      persona={{
        id: profile.id,
        display_name: profile.display_name,
        handle: params.handle,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
      }}
      nodes={nodes}
      totalNodeCount={totalNodeCount ?? 0}
    />
  );
}
