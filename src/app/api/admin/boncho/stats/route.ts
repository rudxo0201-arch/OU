import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/roles';

export async function GET() {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    const { data: nodes } = await supabase
      .from('data_nodes')
      .select('id, title, domain_data')
      .eq('domain', 'knowledge')
      .eq('is_admin_node', true);

    const bonchoNodes = (nodes ?? []).filter(
      (n: any) => n.domain_data?.herb_id,
    );

    const total = bonchoNodes.length;
    const starred = bonchoNodes.filter((n: any) => n.domain_data?.starred).length;
    const enriched = bonchoNodes.filter((n: any) => n.domain_data?.enrichment_status === 'enriched').length;
    const pending = bonchoNodes.filter((n: any) => n.domain_data?.enrichment_status === 'pending').length;
    const partial = bonchoNodes.filter((n: any) => n.domain_data?.enrichment_status === 'partial').length;

    return NextResponse.json({
      stats: { total, starred, enriched, pending, partial },
      herbs: bonchoNodes,
    });
  } catch (e: any) {
    console.error('[Admin/Boncho/Stats] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
