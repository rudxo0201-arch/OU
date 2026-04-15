import { createClient } from '@/lib/supabase/server';
import { MarketClient } from './MarketClient';

export default async function MarketPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('market_items')
    .select('*, profiles(display_name)')
    .order('purchase_count', { ascending: false })
    .limit(30);

  return <MarketClient items={items ?? []} />;
}
