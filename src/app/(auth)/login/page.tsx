'use client';

import { CSSProperties, FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ROUTES } from '@/lib/ou-registry';
import { AuthLayout, OuCard, OuButton, OuInput, OuTabs } from '@/components/ds';

type Tab = 'login' | 'signup';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const supabase = createClient();

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(ROUTES.HOME);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setDone(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <OuCard elevated style={{ animation: 'ou-scale-in 200ms cubic-bezier(0.16,1,0.3,1)' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <OuTabs
            tabs={[
              { key: 'login', label: '로그인' },
              { key: 'signup', label: '회원가입' },
            ]}
            activeKey={tab}
            onChange={(k) => { setTab(k as Tab); setError(''); setDone(false); }}
          />
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✉️</div>
            <p style={{ color: 'var(--ou-text-body)', fontSize: 'var(--ou-text-sm)', lineHeight: 1.6 }}>
              {email}로 확인 이메일을 보냈습니다.<br />
              이메일을 확인해주세요.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <OuInput
              label="이메일"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <OuInput
              label="비밀번호"
              type="password"
              placeholder={tab === 'signup' ? '8자 이상' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              error={error || undefined}
            />

            <OuButton
              type="submit"
              variant="accent"
              size="lg"
              fullWidth
              loading={loading}
              style={{ marginTop: 8 }}
            >
              {tab === 'login' ? '로그인' : '회원가입'}
            </OuButton>

            {/* 구분선 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--ou-glass-border)' }} />
              <span style={{ fontSize: 'var(--ou-text-xs)', color: 'var(--ou-text-muted)' }}>또는</span>
              <div style={{ flex: 1, height: 1, background: 'var(--ou-glass-border)' }} />
            </div>

            {/* Google 로그인 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 16px',
                border: '1px solid var(--ou-glass-border)',
                borderRadius: 'var(--ou-radius-md)',
                background: 'var(--ou-glass-strong)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 'var(--ou-text-sm)',
                fontWeight: 500,
                color: 'var(--ou-text-body)',
                transition: 'background var(--ou-transition-fast)',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ou-glass-strong)'; }}
            >
              {/* Google SVG 아이콘 */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2045c0-.638-.0573-1.252-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6149z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5832-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9574C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
                <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
              </svg>
              Google로 계속하기
            </button>

            {tab === 'login' && (
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--ou-text-muted)',
                    fontSize: 'var(--ou-text-sm)',
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push('/forgot-password')}
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            )}
          </form>
        )}
      </OuCard>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
