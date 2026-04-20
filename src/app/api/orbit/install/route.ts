import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/orbit/install
 * view_preset을 회원의 saved_views에 설치
 *
 * body: { presetKey: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

    const body = await request.json();
    const { presetKey } = body;
    if (!presetKey) return NextResponse.json({ error: 'presetKey가 필요해요.' }, { status: 400 });

    // 프리셋 조회
    const { data: preset, error: presetErr } = await supabase
      .from('view_presets')
      .select('*')
      .eq('key', presetKey)
      .eq('is_active', true)
      .single();

    if (presetErr || !preset) {
      return NextResponse.json({ error: '프리셋을 찾을 수 없어요.' }, { status: 404 });
    }

    // 이미 설치됐는지 확인
    const { data: existing } = await supabase
      .from('saved_views')
      .select('id')
      .eq('user_id', user.id)
      .eq('view_type', preset.view_type)
      .eq('name', preset.name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ viewId: existing.id, alreadyInstalled: true });
    }

    // saved_views에 설치
    const { data: installed, error: installErr } = await supabase
      .from('saved_views')
      .insert({
        user_id: user.id,
        name: preset.name,
        view_type: preset.view_type,
        icon: preset.icon,
        description: preset.description,
        filter_config: (preset.default_config as any)?.filter_config ?? null,
        layout_config: (preset.default_config as any)?.layout_config ?? null,
        schema_map: (preset.default_config as any)?.schema_map ?? null,
        visibility: 'private',
        is_default: false,
        sort_order: 100,
      })
      .select('id')
      .single();

    if (installErr || !installed) {
      return NextResponse.json({ error: '설치에 실패했어요.' }, { status: 500 });
    }

    return NextResponse.json({ viewId: installed.id, alreadyInstalled: false });
  } catch (e) {
    return NextResponse.json({ error: '오류가 발생했어요.' }, { status: 500 });
  }
}

/**
 * DELETE /api/orbit/install?viewId=xxx
 * 설치된 뷰 제거
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const viewId = searchParams.get('viewId');
    if (!viewId) return NextResponse.json({ error: 'viewId가 필요해요.' }, { status: 400 });

    const { error } = await supabase
      .from('saved_views')
      .delete()
      .eq('id', viewId)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: '제거에 실패했어요.' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: '오류가 발생했어요.' }, { status: 500 });
  }
}
