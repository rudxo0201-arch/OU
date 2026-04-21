/**
 * GET /api/preferences — 사용자 환경설정 로드
 * PUT /api/preferences — 사용자 환경설정 저장
 *
 * data_nodes 테이블에 domain='_preferences'인 단일 노드로 저장.
 * 스키마 변경 없이 기존 인프라 활용.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PREF_DOMAIN = '_preferences';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('data_nodes')
      .select('domain_data')
      .eq('user_id', user.id)
      .eq('domain', PREF_DOMAIN)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ preferences: data?.domain_data ?? null });
  } catch (e) {
    console.error('[Preferences/GET]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const preferences = body.preferences;
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    // 기존 preferences 노드 찾기
    const { data: existing } = await supabase
      .from('data_nodes')
      .select('id')
      .eq('user_id', user.id)
      .eq('domain', PREF_DOMAIN)
      .limit(1)
      .maybeSingle();

    if (existing) {
      // 업데이트
      const { error } = await supabase
        .from('data_nodes')
        .update({ domain_data: preferences, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) {
        console.error('[Preferences/PUT] update error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // 신규 생성
      const { error } = await supabase
        .from('data_nodes')
        .insert({
          user_id: user.id,
          domain: PREF_DOMAIN,
          domain_data: preferences,
          raw: '_preferences',
        });

      if (error) {
        console.error('[Preferences/PUT] insert error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Preferences/PUT]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
