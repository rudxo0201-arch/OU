'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NeuAuthLayout, NeuTabs, NeuInput, NeuButton, NeuDivider, NeuCard } from '@/components/ds';

const GOOGLE_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 1 : 0;

  const [tabIdx, setTabIdx] = useState(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const tab = tabIdx === 0 ? 'login' : 'signup';
  const supabase = createClient();

  const handleGoogle = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/my` },
    });
    if (error) setError(error.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); }
      else router.push('/my');
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/my` },
      });
      if (error) { setError(error.message); setLoading(false); }
      else { setSignupDone(true); setLoading(false); }
    }
  };

  return (
    <NeuAuthLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <NeuTabs
          tabs={['로그인', '회원가입']}
          active={tabIdx}
          onChange={(i) => { setTabIdx(i); setError(''); setSignupDone(false); }}
        />

        {signupDone ? (
          <NeuCard variant="pressed" style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--ou-text-heading)' }}>
              인증 메일을 보냈어요
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ou-text-muted)' }}>
              <strong style={{ color: 'var(--ou-text-body)' }}>{email}</strong>
              <br />메일함을 확인해주세요
            </p>
          </NeuCard>
        ) : (
          <>
            <NeuButton variant="default" fullWidth onClick={handleGoogle} style={{ gap: 10, boxShadow: 'var(--ou-neu-raised-sm)', fontWeight: 600 }}>
              {GOOGLE_ICON}
              Google로 계속하기
            </NeuButton>

            <NeuDivider label="또는" />

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <NeuInput
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ borderRadius: 999, padding: '13px 18px' }}
              />
              <NeuInput
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ borderRadius: 999, padding: '13px 18px' }}
              />

              {error && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ou-accent)', textAlign: 'center' }}>
                  {error}
                </p>
              )}

              <NeuButton type="submit" variant="accent" fullWidth disabled={loading}>
                {loading ? '…' : tab === 'login' ? '로그인' : '회원가입'}
              </NeuButton>

              {tab === 'login' && (
                <div style={{ textAlign: 'center' }}>
                  <NeuButton variant="ghost" size="sm" onClick={() => router.push('/forgot-password')}>
                    비밀번호를 잊으셨나요?
                  </NeuButton>
                </div>
              )}
            </form>
          </>
        )}

        <div style={{ textAlign: 'center' }}>
          <NeuButton variant="ghost" size="sm" onClick={() => router.push('/')}>
            ← 돌아가기
          </NeuButton>
        </div>
      </div>
    </NeuAuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--ou-bg)' }} />}>
      <LoginContent />
    </Suspense>
  );
}
