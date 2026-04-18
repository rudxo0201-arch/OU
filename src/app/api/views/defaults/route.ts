import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/roles';
import { DEFAULT_VIEWS } from '@/lib/views/default-views';

export async function POST() {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 이미 존재하는 기본 뷰 확인
    const { data: existing } = await supabase
      .from('saved_views')
      .select('view_type')
      .eq('user_id', user.id)
      .eq('is_default', true);

    const existingTypes = new Set((existing ?? []).map(v => v.view_type));

    // 없는 것만 생성
    const toInsert = DEFAULT_VIEWS
      .filter(v => !existingTypes.has(v.view_type))
      .map(v => ({
        user_id: user.id,
        name: v.name,
        view_type: v.view_type,
        icon: v.icon,
        description: v.description,
        filter_config: v.filter_config,
        schema_map: v.schema_map,
        sort_order: v.sort_order,
        is_default: true,
        visibility: 'public' as const,
      }));

    if (toInsert.length === 0) {
      return NextResponse.json({ success: true, created: 0, message: '이미 모든 기본 뷰가 존재합니다' });
    }

    const { data, error } = await supabase
      .from('saved_views')
      .insert(toInsert)
      .select('id, name, view_type');

    if (error) {
      console.error('[Views/Defaults] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to create default views' }, { status: 500 });
    }

    return NextResponse.json({ success: true, created: data?.length ?? 0, views: data });
  } catch (e) {
    console.error('[Views/Defaults] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
