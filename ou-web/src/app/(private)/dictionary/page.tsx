import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DictionaryPageClient } from './DictionaryPageClient';

export default async function DictionaryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // 초기 로드: 급수 있는 한자 100개 (획수 순)
  const { data: initialNodes } = await supabase
    .from('data_nodes')
    .select('id, domain, domain_data, created_at, visibility')
    .eq('is_admin_node', true)
    .eq('domain', 'knowledge')
    .filter('domain_data->>type', 'eq', 'hanja')
    .not('domain_data->>grade', 'is', null)
    .order('domain_data->>stroke_count' as any, { ascending: true })
    .limit(100);

  return <DictionaryPageClient initialNodes={initialNodes || []} />;
}
