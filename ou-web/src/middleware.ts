import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/universe', '/login', '/terms-agree', '/profile', '/b2b', '/market', '/join', '/api/og', '/forgot-password', '/reset-password', '/auth/confirm', '/auth/callback', '/auth/verified', '/try'];
const GUEST_ALLOWED = ['/chat'];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // 로그인 상태로 /login 접근 → /my
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/my', request.url));
  }

  // 관리자 세션 타임아웃 (30분) — 쿠키 기반 활동 추적
  if (ADMIN_ROUTES.some(r => path.startsWith(r)) && user) {
    const ADMIN_TIMEOUT = process.env.NODE_ENV === 'development' ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
    const lastActivity = request.cookies.get('admin_last_activity')?.value;
    const now = Date.now();

    if (lastActivity && (now - parseInt(lastActivity, 10)) > ADMIN_TIMEOUT) {
      // 타임아웃: 쿠키 삭제 후 로그인으로
      await supabase.auth.signOut();
      const redirectResponse = NextResponse.redirect(new URL('/login?reason=timeout', request.url));
      redirectResponse.cookies.delete('admin_last_activity');
      return redirectResponse;
    }

    // 활동 시간 갱신
    response.cookies.set('admin_last_activity', now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_TIMEOUT / 1000,
    });
  }

  // API 라우트는 미들웨어에서 리다이렉트하지 않음 (각 API가 자체 인증 처리)
  if (path.startsWith('/api/')) return response;

  const isPublic = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/'));
  const isGuestAllowed = GUEST_ALLOWED.some(r => path === r || path.startsWith(r + '/'));
  if (isPublic || isGuestAllowed) return response;

  // private 라우트: 비로그인 → /login
  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
