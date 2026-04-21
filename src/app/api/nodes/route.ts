import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { COPY } from '@/lib/copy';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: COPY.error.unauthorized }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam ?? '200', 10) || 200, 500);
    const domainsOnly = searchParams.get('domains') === 'true';

    // ?domains=true: 사용자가 보유한 고유 도메인 목록 반환
    if (domainsOnly) {
      const { data, error } = await supabase
        .from('data_nodes')
        .select('domain')
        .eq('user_id', user.id);

      if (error) {
        console.error('[Nodes/GET] domains error:', error.message);
        return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
      }

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.domain) counts[row.domain] = (counts[row.domain] ?? 0) + 1;
      }
      const domains = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ key, count }));

      return NextResponse.json({ domains });
    }

    let query = supabase
      .from('data_nodes')
      .select('id, domain, domain_data, raw, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (domain) {
      query = query.eq('domain', domain);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Nodes/GET] Supabase error:', error.message);
      return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
    }

    return NextResponse.json({ nodes: data ?? [] });
  } catch (e) {
    console.error('[Nodes/GET] Unexpected error:', e);
    return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
  }
}
