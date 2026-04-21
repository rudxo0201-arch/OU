'use client';

import { CSSProperties, FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout, GlassCard, GlassButton, GlassInput, GlassTabs } from '@/components/ds';

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/home');
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
    <GlassCard elevated style={{ animation: 'ou-scale-in 200ms cubic-bezier(0.16,1,0.3,1)' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <GlassTabs
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
            <GlassInput
              label="이메일"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <GlassInput
              label="비밀번호"
              type="password"
              placeholder={tab === 'signup' ? '8자 이상' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              error={error || undefined}
            />

            <GlassButton
              type="submit"
              variant="accent"
              size="lg"
              fullWidth
              loading={loading}
              style={{ marginTop: 8 }}
            >
              {tab === 'login' ? '로그인' : '회원가입'}
            </GlassButton>

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
      </GlassCard>
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
