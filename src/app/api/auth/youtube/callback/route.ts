/**
 * GET /api/auth/youtube/callback
 *
 * Google OAuth 콜백 처리:
 * 1. code → access_token 교환
 * 2. YouTube Subscriptions API로 구독 채널 목록 조회 (1회)
 * 3. 채널 ID 목록을 Redis에 저장 (30일 TTL)
 * 4. /youtube 로 리디렉트
 *
 * 보안: state 검증으로 CSRF 방지. 토큰은 채널 ID 수집 후 즉시 폐기.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveChannelIds } from '@/lib/youtube/channel-store';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SUBSCRIPTIONS_URL = 'https://www.googleapis.com/youtube/v3/subscriptions';

async function fetchAllChannelIds(accessToken: string): Promise<string[]> {
  const channelIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      mine: 'true',
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    });

    const res = await fetch(`${SUBSCRIPTIONS_URL}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) break;

    const data = await res.json();
    for (const item of data.items ?? []) {
      const id = item.snippet?.resourceId?.channelId;
      if (id) channelIds.push(id);
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return channelIds;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/youtube?error=oauth_denied`);
  }

  // state 검증
  let stateData: { userId: string };
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch {
    return NextResponse.redirect(`${appUrl}/youtube?error=invalid_state`);
  }

  // OU 세션에서 현재 로그인 유저 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== stateData.userId) {
    return NextResponse.redirect(`${appUrl}/youtube?error=auth_mismatch`);
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/youtube?error=config_error`);
  }

  const redirectUri = `${appUrl}/api/auth/youtube/callback`;

  // code → access_token 교환
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/youtube?error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json();
  const accessToken: string = tokenData.access_token;

  // 구독 채널 목록 조회 (1회, 이후 RSS 사용)
  const channelIds = await fetchAllChannelIds(accessToken);

  // Redis에 저장 (30일 TTL). 토큰은 여기서 사용 후 폐기.
  await saveChannelIds(user.id, channelIds);

  return NextResponse.redirect(`${appUrl}/youtube?connected=1`);
}
