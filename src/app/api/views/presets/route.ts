import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/views/presets
 * 활성 뷰 프리셋 목록 조회 (전체 또는 도메인 필터)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const category = searchParams.get('category'); // inline | full | cross

    const supabase = await createClient();

    let query = supabase
      .from('view_presets')
      .select('*')
      .eq('is_active', true)
      .order('domain')
      .order('sort_order');

    if (domain) query = query.eq('domain', domain);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ presets: data || [] });
  } catch (e) {
    return NextResponse.json({ presets: [], error: String(e) }, { status: 500 });
  }
}
