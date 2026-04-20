/**
 * GET /api/youtube/feed
 *
 * 회원의 구독 채널 RSS 피드를 조합해 반환.
 * YouTube Data API 미사용 — 할당량 제한 없음.
 *
 * Response:
 *   { videos: YTFeedVideo[], connected: boolean }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getChannelIds } from '@/lib/youtube/channel-store';
import { buildFeed } from '@/lib/youtube/feed-crawler';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const channelIds = await getChannelIds(user.id);

  if (!channelIds || channelIds.length === 0) {
    return NextResponse.json({ videos: [], connected: false });
  }

  const videos = await buildFeed(channelIds);
  return NextResponse.json({ videos, connected: true });
}
