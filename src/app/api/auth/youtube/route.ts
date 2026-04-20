/**
 * GET /api/auth/youtube
 *
 * YouTube OAuth 연동 시작 — Google OAuth 2.0 인증 URL로 리디렉트.
 * 스코프: youtube.readonly (구독 채널 목록만 읽기)
 *
 * 환경변수 필요:
 *   YOUTUBE_CLIENT_ID     — Google Cloud Console OAuth 클라이언트 ID
 *   YOUTUBE_CLIENT_SECRET — Google Cloud Console OAuth 클라이언트 시크릿
 *   NEXT_PUBLIC_APP_URL   — 배포 URL (예: https://ouuniverse.com)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

export async function GET(req: NextRequest) {
  // 인증 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'YouTube OAuth 미설정' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/youtube/callback`;

  // state에 userId를 포함해 callback에서 검증
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'online',    // 구독 목록만 읽으므로 refresh token 불필요
    prompt: 'select_account',
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
