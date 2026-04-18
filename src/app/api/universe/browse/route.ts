import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/headers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)));
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    const { data: nodes, error } = await supabase
      .from('data_nodes')
      .select('id, title, domain, importance, created_at, raw, user_id, profiles(display_name, handle)')
      .eq('visibility', 'public')
      .not('domain_data->>_admin_internal', 'eq', 'true')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Universe/Browse] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to load data' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ nodes: nodes ?? [] }, { headers: corsHeaders });
  } catch (e) {
    console.error('[Universe/Browse] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
