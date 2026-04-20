/**
 * POST /api/auth/youtube/disconnect
 *
 * YouTube 연동 해제 — Redis에서 채널 ID 목록 삭제.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clearChannelIds } from '@/lib/youtube/channel-store';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await clearChannelIds(user.id);
  return NextResponse.json({ ok: true });
}
