import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrbDef } from '@/components/orb/registry';
import { OrbPageClient } from './OrbPageClient';
import { ROUTES } from '@/lib/ou-registry';

const STANDALONE_ORBS: Record<string, string> = {
  settings: '/settings',
};

export default async function OrbPage({ params }: { params: { slug: string } }) {
  const orb = getOrbDef(params.slug);
  if (!orb) redirect(ROUTES.HOME);
  if (STANDALONE_ORBS[params.slug]) redirect(STANDALONE_ORBS[params.slug]);

  let initialNodes: any[] = [];
  if (orb.domain) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(ROUTES.LOGIN);

    const { data } = await supabase
      .from('data_nodes')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain', orb.domain)
      .order('created_at', { ascending: false })
      .limit(200);
    initialNodes = data ?? [];
  }

  return <OrbPageClient orb={orb} initialNodes={initialNodes} />;
}
