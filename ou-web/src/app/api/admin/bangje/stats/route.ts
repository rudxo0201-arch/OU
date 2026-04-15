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

    const bangjeNodes = (nodes ?? []).filter(
      (n: any) => n.domain_data?.formula_id,
    );

    const total = bangjeNodes.length;
    const starred = bangjeNodes.filter((n: any) => n.domain_data?.starred).length;
    const enriched = bangjeNodes.filter((n: any) => n.domain_data?.enrichment_status === 'enriched').length;
    const pending = bangjeNodes.filter((n: any) => n.domain_data?.enrichment_status === 'pending').length;
    const partial = bangjeNodes.filter((n: any) => n.domain_data?.enrichment_status === 'partial').length;

    return NextResponse.json({
      stats: { total, starred, enriched, pending, partial },
      formulas: bangjeNodes,
    });
  } catch (e: any) {
    console.error('[Admin/Bangje/Stats] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
