import { createClient } from '@/lib/supabase/server';
import { UniverseClient } from './UniverseClient';

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

export default async function UniversePage() {
  const supabase = await createClient();

  // 1. Find admin user ID
  let adminUserId: string | null = null;
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1);

  adminUserId = adminProfiles?.[0]?.id ?? null;

  // 2. Fetch admin's public nodes (service intro data)
  let adminNodes: any[] = [];
  if (adminUserId) {
    const { data } = await supabase
      .from('data_nodes')
      .select('id, title, domain, importance, created_at, raw, user_id, domain_data, profiles(display_name, handle)')
      .eq('user_id', adminUserId)
      .eq('visibility', 'public')
      .eq('source_type', 'manual')
      .order('importance', { ascending: false });

    adminNodes = (data ?? []).map((node: any) => ({
      ...node,
      profiles: Array.isArray(node.profiles) ? node.profiles[0] ?? null : node.profiles,
    }));
  }

  // 3. Fetch other public nodes (excluding admin's manual/seed nodes and admin_internal)
  const query = supabase
    .from('data_nodes')
    .select('id, title, domain, importance, created_at, raw, user_id, profiles(display_name, handle)')
    .eq('visibility', 'public')
    .not('domain_data->>_admin_internal', 'eq', 'true')
    .order('created_at', { ascending: false })
    .limit(30);

  // Exclude admin's manual nodes from the general feed (they're shown separately)
  if (adminUserId) {
    query.or(`user_id.neq.${adminUserId},source_type.neq.manual`);
  }

  const { data: publicNodes } = await query;

  // 4. Get distinct domains that actually have data (exclude admin_internal)
  const { data: domainRows } = await supabase
    .from('data_nodes')
    .select('domain')
    .eq('visibility', 'public')
    .not('domain_data->>_admin_internal', 'eq', 'true');

  const activeDomains = Array.from(
    new Set((domainRows ?? []).map((r: any) => r.domain).filter(Boolean))
  );

  const normalizedNodes = (publicNodes ?? []).map((node: any) => ({
    ...node,
    profiles: Array.isArray(node.profiles) ? node.profiles[0] ?? null : node.profiles,
  }));

  // Categorize admin nodes
  const introNodes = adminNodes.filter(
    n => n.domain === 'knowledge' && n.domain_data?.category !== 'faq' && n.domain_data?.topic !== 'FAQ' && n.domain_data?.category !== 'scenario'
  );
  const featureNodes = adminNodes.filter(n => n.domain === 'product');
  const usecaseNodes = adminNodes.filter(n => n.domain === 'education');
  const faqNodes = adminNodes.filter(
    n => n.domain === 'knowledge' && (n.domain_data?.category === 'faq' || n.domain_data?.topic === 'FAQ')
  );
  const scenarioNodes = adminNodes.filter(
    n => n.domain === 'knowledge' && n.domain_data?.category === 'scenario'
  );

  return (
    <UniverseClient
      initialNodes={normalizedNodes}
      activeDomains={activeDomains as string[]}
      introNodes={introNodes}
      featureNodes={featureNodes}
      usecaseNodes={usecaseNodes}
      faqNodes={faqNodes}
      scenarioNodes={scenarioNodes}
    />
  );
}
