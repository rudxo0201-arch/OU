import { NextResponse } from 'next/server';

/**
 * GET /api/views/presets
 * 활성 뷰 프리셋 목록 조회 — 공개 데이터, 인증 불필요
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const category = searchParams.get('category');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const params = new URLSearchParams({
      select: '*',
      is_active: 'eq.true',
      order: 'domain.asc,sort_order.asc',
    });
    if (domain) params.set('domain', `eq.${domain}`);
    if (category) params.set('category', `eq.${category}`);

    const res = await fetch(`${supabaseUrl}/rest/v1/view_presets?${params}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ presets: [], error: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ presets: data || [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ presets: [], error: msg }, { status: 500 });
  }
}
