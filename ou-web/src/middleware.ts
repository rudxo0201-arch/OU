import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/universe', '/login', '/terms-agree', '/profile', '/b2b', '/market', '/join', '/api/og', '/forgot-password', '/reset-password', '/auth/confirm', '/auth/callback', '/auth/verified'];
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

  // 관리자 세션 타임아웃 (30분)
  if (ADMIN_ROUTES.some(r => path.startsWith(r)) && user) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (session) {
      // created_at (세션 생성 또는 마지막 리프레시 시각) 기준
      const createdAt = (session as any).created_at
        ? new Date((session as any).created_at).getTime()
        : (session.expires_at! * 1000 - 7 * 24 * 60 * 60 * 1000);
      const sessionAge = Date.now() - createdAt;
      if (sessionAge > 30 * 60 * 1000) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/login?reason=timeout', request.url));
      }
    }
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
