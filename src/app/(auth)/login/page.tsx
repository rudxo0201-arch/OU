'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';

  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const supabase = createClient();

  const handleGoogle = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/my`,
      },
    });
    if (error) setError(error.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push('/my');
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/my` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setSignupDone(true);
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <Stars />

      <div style={{
        width: 400, maxWidth: '90vw', padding: 40,
        borderRadius: 16,
        border: '0.5px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.015)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 0 40px rgba(255,255,255,0.03)',
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "var(--font-orbitron, 'Orbitron')",
            fontSize: 32, fontWeight: 800,
            color: 'rgba(255,255,255,0.95)', letterSpacing: 4, marginBottom: 4,
          }}>OU</div>
          <div style={{
            fontFamily: "var(--font-orbitron, 'Orbitron')",
            fontSize: 8, fontWeight: 500,
            color: 'rgba(255,255,255,0.25)', letterSpacing: 4, textTransform: 'uppercase',
          }}>OWN UNIVERSE</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderRadius: 999, border: '0.5px solid rgba(255,255,255,0.10)', overflow: 'hidden' }}>
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSignupDone(false); }}
              style={{
                flex: 1, padding: '10px 0', fontSize: 13,
                background: tab === t ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: tab === t ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                fontWeight: tab === t ? 600 : 400, transition: '180ms ease',
              }}>
              {t === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        {signupDone ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.8 }}>
            인증 메일을 보냈어요.<br />메일함을 확인해주세요.
          </div>
        ) : (
          <>
            {/* Google */}
            <button onClick={handleGoogle} style={{
              width: '100%', padding: '12px 0', borderRadius: 999,
              border: '0.5px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: '180ms ease',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google로 계속하기
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>또는</span>
              <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="이메일" required
                style={{
                  padding: '12px 20px', borderRadius: 999,
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  background: 'transparent', color: 'rgba(255,255,255,0.9)',
                  fontSize: 14, outline: 'none', transition: '180ms ease',
                }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호" required minLength={6}
                style={{
                  padding: '12px 20px', borderRadius: 999,
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  background: 'transparent', color: 'rgba(255,255,255,0.9)',
                  fontSize: 14, outline: 'none', transition: '180ms ease',
                }} />

              {error && (
                <div style={{ fontSize: 12, color: 'rgba(255,100,100,0.8)', textAlign: 'center' }}>{error}</div>
              )}

              <button type="submit" disabled={loading} style={{
                padding: '12px 0', borderRadius: 999,
                background: loading ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)',
                color: '#111', fontSize: 14, fontWeight: 600,
                transition: '180ms ease', cursor: loading ? 'wait' : 'pointer',
              }}>
                {loading ? '...' : tab === 'login' ? 'Log in' : 'Sign up'}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => router.push('/')} style={{
            fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '4px 8px', transition: 'color 150ms',
          }}>← 돌아가기</button>
        </div>
      </div>
    </div>
  );
}

// Stars background
function Stars() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 80 }).map((_, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          width: `${Math.random() * 1.5 + 0.5}px`, height: `${Math.random() * 1.5 + 0.5}px`,
          borderRadius: '50%', background: 'rgba(255,255,255,0.4)',
          animation: `twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 3}s infinite alternate`,
        }} />
      ))}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#060810' }} />}>
      <LoginContent />
    </Suspense>
  );
}
