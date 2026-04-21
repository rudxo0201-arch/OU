/**
 * POST /api/views/init-admin
 *
 * 관리자 계정에 전체 뷰(앱)를 자동 설치.
 * 이미 존재하는 뷰는 스킵 — 멱등성 보장.
 * 관리자만 호출 가능.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VIEW_LABELS } from '@/components/views/registry';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean);

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 기존 saved_views 조회
  const { data: existing } = await supabase
    .from('saved_views')
    .select('view_type')
    .eq('user_id', user.id);

  const existingTypes = new Set((existing ?? []).map((v: { view_type: string }) => v.view_type));

  // 미설치 뷰만 insert
  const toInsert = Object.entries(VIEW_LABELS)
    .filter(([viewType]) => !existingTypes.has(viewType))
    .map(([viewType, name]) => ({
      user_id: user.id,
      name,
      view_type: viewType,
      custom_code: null,
      filter_config: null,
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, installed: 0, message: '이미 전체 설치됨' });
  }

  const { error } = await supabase.from('saved_views').insert(toInsert);

  if (error) {
    console.error('[init-admin] insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, installed: toInsert.length });
}
