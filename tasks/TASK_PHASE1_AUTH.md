# 작업 지시서 — Phase 1 Step 1: 인증 (Auth)

> Phase 0 셋업 완료 후 실행.
> 완료 기준: Google OAuth + 이메일 로그인 작동, 미들웨어 라우팅 정상.

---

## 사전 읽기 (필수)

```
CLAUDE.md              → 전역 원칙 (인증 게이트, disabled 금지)
docs/VISION.md         → 온보딩 대화 흐름 (가입 후 첫 대화)
docs/FRONTEND_DESIGN.md → UX 플로우 Flow 1, Flow 2 (온보딩, 인증)
docs/TECH.md           → Supabase Auth 보안 원칙
```

---

## 구현 범위

```
[ ] Supabase Auth 미들웨어
[ ] /login 페이지 (Google OAuth + 이메일)
[ ] /terms-agree 페이지
[ ] 이메일 verify 처리
[ ] 로그인 후 리다이렉트
[ ] 비로그인 → /login 자동 리다이렉트
[ ] 관리자 역할 체크
[ ] 온보딩 첫 대화 진입점
```

---

## Step 1. 미들웨어 설정

### `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 로그인 없이 접근 가능한 라우트
const PUBLIC_ROUTES = ['/', '/universe', '/login', '/terms-agree'];
// 비로그인도 N턴 체험 허용
const GUEST_ALLOWED = ['/chat'];

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

  // 로그인 상태로 /login 접근 → /my로 리다이렉트
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/my', request.url));
  }

  // PUBLIC_ROUTES, GUEST_ALLOWED는 통과
  const isPublic = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r));
  const isGuestAllowed = GUEST_ALLOWED.some(r => path === r);
  if (isPublic || isGuestAllowed) return response;

  // 나머지 private 라우트: 비로그인 → /login
  // ⚠️ disabled 금지 원칙: 버튼을 막는 게 아니라 라우트에서 막는다
  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', path); // 로그인 후 원래 가려던 곳으로
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Step 2. /login 페이지

### UX 플로우

```
진입 경로:
  A) 직접 접근
  B) 비로그인으로 private 라우트 접근 → 자동 리다이렉트

화면 상태:
  default:    Google 버튼 + 이메일 폼
  loading:    버튼 로딩 스피너
  error:      에러 메시지 인라인
  success:    → ?next 파라미터 경로 or /my

인터랙션:
  [Google 버튼] + [클릭]
    → Supabase Google OAuth 팝업
    → 성공: /my or ?next
    → 실패: "Google 로그인에 실패했어요" 토스트

  [이메일 입력] + [제출]
    → OTP 이메일 발송
    → "이메일을 확인해주세요" 안내 화면으로 전환

  [이메일 verify 링크 클릭] (이메일에서)
    → /auth/callback → 세션 생성 → /my
```

### `src/app/(auth)/login/page.tsx`

```tsx
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Stack, TextInput, Button, Divider, Text, Paper, Center, Title, Anchor
} from '@mantine/core';
import { GoogleLogo } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { notifications } from '@mantine/notifications';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/my';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const supabase = createClient();

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${nextPath}` },
    });
    if (error) {
      notifications.show({ message: 'Google 로그인에 실패했어요', color: 'red' });
      setLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${nextPath}` },
    });
    if (error) {
      notifications.show({ message: '이메일 전송에 실패했어요. 다시 시도해주세요', color: 'red' });
    } else {
      setEmailSent(true);
    }
    setLoading(false);
  }

  if (emailSent) {
    return (
      <Center h="100dvh">
        <Stack align="center" gap="md">
          <Title order={3}>이메일을 확인해주세요 📬</Title>
          <Text c="dimmed" ta="center" maw={320}>
            {email}로 로그인 링크를 보냈어요.
            링크를 클릭하면 자동으로 로그인됩니다.
          </Text>
          <Anchor size="sm" onClick={() => setEmailSent(false)}>
            다른 이메일로 시도하기
          </Anchor>
        </Stack>
      </Center>
    );
  }

  return (
    <Center h="100dvh">
      <Paper w={360} p="xl" radius="lg">
        <Stack gap="lg">
          <Stack gap={4} align="center">
            <Title order={2} fw={700}>OU</Title>
            <Text c="dimmed" size="sm">Just talk.</Text>
          </Stack>

          {/* Google OAuth — 메인 CTA */}
          <Button
            leftSection={<GoogleLogo size={20} />}
            variant="default"
            size="md"
            fullWidth
            loading={loading}
            onClick={handleGoogle}
          >
            Google로 계속하기
          </Button>

          <Divider label="또는" labelPosition="center" />

          {/* 이메일 OTP */}
          <form onSubmit={handleEmail}>
            <Stack gap="sm">
              <TextInput
                placeholder="이메일 주소"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Button
                type="submit"
                variant="filled"
                fullWidth
                loading={loading}
                disabled={!email}
              >
                이메일로 계속하기
              </Button>
            </Stack>
          </form>

          <Text size="xs" c="dimmed" ta="center">
            계속하면{' '}
            <Anchor size="xs" href="/terms-agree">이용약관</Anchor>
            에 동의하는 것으로 간주합니다.
          </Text>
        </Stack>
      </Paper>
    </Center>
  );
}
```

---

## Step 3. Auth Callback 라우트

### `src/app/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/my';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 실패 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

---

## Step 4. 사용자 프로필 + 역할 초기화

가입 직후 profiles 테이블 초기화는 Supabase Database Trigger로 처리한다.

Supabase SQL Editor에서 실행:

```sql
-- 회원가입 시 자동으로 profiles 레코드 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL
  );

  -- 기본 Free 구독 생성
  INSERT INTO public.subscriptions (user_id, plan, token_limit)
  VALUES (NEW.id, 'free', 100);

  -- 기본 역할 부여 (member)
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.id, id FROM public.roles WHERE name = 'member';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Step 5. 관리자 역할 체크 훅

### `src/lib/auth/isAdmin.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // 관리자 = @ouuniverse.com 이메일
  const adminDomain = process.env.ADMIN_EMAIL_DOMAIN || 'ouuniverse.com';
  return user.email?.endsWith(`@${adminDomain}`) ?? false;
}
```

### `src/app/(private)/admin/page.tsx` 업데이트

```typescript
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/isAdmin';

export default async function AdminPage() {
  const admin = await isAdmin();
  if (!admin) redirect('/my');

  return <div>관리자 패널 (구현 예정)</div>;
}
```

---

## Step 6. 현재 유저 Zustand 스토어

### `src/stores/authStore.ts`

```typescript
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

### Auth 초기화 Provider

### `src/components/ui/AuthProvider.tsx`

```tsx
'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  const supabase = createClient();

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // 세션 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
```

`src/app/layout.tsx`에 AuthProvider 추가:
```tsx
// MantineProvider 안에 추가
<AuthProvider>
  {children}
</AuthProvider>
```

---

## Step 7. 온보딩 진입 처리

가입 완료 후 첫 방문인지 확인 → /chat으로 보내되 온보딩 플래그 설정.

### `src/app/auth/callback/route.ts` 수정

```typescript
// 신규 가입자 감지 (profiles.created_at이 방금인 경우)
const { data: profile } = await supabase
  .from('profiles')
  .select('created_at')
  .eq('id', user.id)
  .single();

const isNewUser = profile &&
  Date.now() - new Date(profile.created_at).getTime() < 10_000;

const redirectPath = isNewUser ? '/chat?onboarding=true' : next;
return NextResponse.redirect(`${origin}${redirectPath}`);
```

/chat 에서 `?onboarding=true` 파라미터 감지 시 → OU 첫 인사 메시지 표시
(채팅 구현 Phase에서 처리)

---

## Step 8. 로그아웃

### `src/lib/auth/signOut.ts`

```typescript
'use client';
import { createClient } from '@/lib/supabase/client';

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/';
}
```

---

## Step 9. 검증

```bash
# 1. 빌드 확인
pnpm build

# 2. 수동 테스트 시나리오
# A) Google OAuth: /login → Google 버튼 → 가입 → /my 리다이렉트
# B) 이메일 OTP: /login → 이메일 입력 → 메일 확인 → /my
# C) 비로그인으로 /my 접근 → /login?next=/my 리다이렉트
# D) 로그인 상태로 /login 접근 → /my 리다이렉트
# E) /admin 접근 (일반 유저) → /my 리다이렉트
# F) 로그아웃 → / 이동
```

---

## 완료 체크리스트

```
[ ] 미들웨어: private 라우트 비로그인 차단
[ ] /login: Google OAuth 작동
[ ] /login: 이메일 OTP 작동
[ ] /auth/callback: 세션 교환 + 리다이렉트
[ ] Supabase Trigger: 가입 시 profiles + subscriptions 자동 생성
[ ] isAdmin(): @ouuniverse.com 체크
[ ] AuthProvider: 세션 변경 감지
[ ] 온보딩 플래그 (?onboarding=true) 처리
[ ] pnpm build 타입 에러 없음
[ ] git commit
```

---

## 다음 작업

**TASK_PHASE1_CHAT.md** → OU-Chat 핵심 구현
- 채팅 UI (메시지 스트림, 입력창)
- Claude Sonnet 스트리밍 연동
- DataNode 파이프라인 Layer 1/2/3
- NodeCreatedBadge, SaveNudge
- 비로그인 5턴 체험
