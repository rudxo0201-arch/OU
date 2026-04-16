'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Stack, TextInput, PasswordInput, Button, Text, Center, Anchor, Box
} from '@mantine/core';
import { GoogleLogo } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { notifications } from '@mantine/notifications';

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/my';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [needVerify, setNeedVerify] = useState(false);

  // URL 쿼리 파라미터로 전달된 에러/사유 표시
  useEffect(() => {
    const error = searchParams.get('error');
    const reason = searchParams.get('reason');

    if (error === 'auth_failed') {
      notifications.show({ message: '인증에 실패했어요. 다시 시도해주세요.', color: 'gray' });
    } else if (error) {
      notifications.show({ message: decodeURIComponent(error), color: 'gray' });
    }

    if (reason === 'timeout') {
      notifications.show({ message: '세션이 만료되었어요. 다시 로그인해주세요.', color: 'gray' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGoogle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    if (error) {
      console.error('Google OAuth error:', error);
      notifications.show({ message: 'Google 로그인에 실패했어요. 잠시 후 다시 시도해주세요.', color: 'gray' });
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      notifications.show({ message: '비밀번호는 6자 이상이어야 해요', color: 'gray' });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent('/auth/verified')}` },
      });
      if (error) {
        notifications.show({ message: error.message === 'User already registered'
          ? '이미 가입된 이메일이에요. 로그인해주세요.'
          : '회원가입에 실패했어요. 다시 시도해주세요.', color: 'gray' });
      } else {
        // 가입 성공 → 로그인 탭으로 전환
        setMode('login');
        notifications.show({ message: '가입이 완료되었어요. 로그인해주세요.', color: 'gray' });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === 'Email not confirmed') {
          setNeedVerify(true);
        } else {
          notifications.show({ message: error.message === 'Invalid login credentials'
            ? '이메일 또는 비밀번호가 틀렸어요'
            : '로그인에 실패했어요', color: 'gray' });
        }
      } else {
        window.location.href = nextPath;
      }
    }
    setLoading(false);
  }

  // 이메일 인증 대기: 3초마다 로그인 시도하여 인증 완료 감지
  useEffect(() => {
    if (!needVerify || !email || !password) return;

    const interval = setInterval(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        clearInterval(interval);
        window.location.href = nextPath;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [needVerify, email, password, nextPath]);

  if (needVerify) {
    return (
      <Box
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ou-space)',
        }}
      >
        <Stack
          align="center"
          gap="md"
          style={{
            maxWidth: 400,
            width: '90%',
            padding: 32,
            background: 'transparent',
            border: '0.5px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-card)',
            boxShadow: 'var(--ou-glow-sm)',
          }}
        >
          <Text
            style={{
              fontFamily: 'var(--ou-font-logo)',
              fontSize: 36,
              fontWeight: 500,
              color: 'var(--ou-text-bright)',
            }}
          >
            OU
          </Text>
          <Text
            style={{ color: 'var(--ou-text-strong)', fontSize: 16, fontWeight: 600 }}
            ta="center"
          >
            이메일 인증이 필요해요
          </Text>
          <Text style={{ color: 'var(--ou-text-dimmed)', fontSize: 13 }} ta="center">
            <strong style={{ color: 'var(--ou-text-body)' }}>{email}</strong>로 보낸 인증 메일을 확인해주세요.
            <br />인증이 완료되면 자동으로 이동합니다.
          </Text>
          <button
            onClick={() => setNeedVerify(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ou-text-dimmed)',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: '8px 0',
              transition: 'var(--ou-transition)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ou-text-body)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ou-text-dimmed)')}
          >
            로그인으로 돌아가기
          </button>
        </Stack>
      </Box>
    );
  }

  const inputStyles = {
    root: { width: '100%' },
    label: { color: 'var(--ou-text-dimmed)', fontSize: 11, fontWeight: 500, marginBottom: 6 },
    input: {
      background: 'transparent',
      border: '0.5px solid var(--ou-border-subtle)',
      borderRadius: 'var(--ou-radius-pill)',
      color: 'var(--ou-text-bright)',
      fontSize: 14,
      padding: '12px 20px',
      height: 44,
      transition: 'var(--ou-transition)',
      '&:focus': {
        borderColor: 'var(--ou-border-strong)',
        boxShadow: 'var(--ou-glow-md)',
      },
      '&::placeholder': {
        color: 'var(--ou-text-muted)',
      },
    },
    innerInput: {
      color: 'var(--ou-text-bright)',
    },
  };

  return (
    <Box
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ou-space)',
      }}
    >
      <Box
        style={{
          maxWidth: 400,
          width: '90%',
          padding: 32,
          background: 'transparent',
          border: '0.5px solid var(--ou-border-subtle)',
          borderRadius: 'var(--ou-radius-card)',
          boxShadow: 'var(--ou-glow-sm)',
        }}
      >
        <Stack gap="lg">
          {/* Logo */}
          <Stack gap={4} align="center">
            <Text
              style={{
                fontFamily: 'var(--ou-font-logo)',
                fontSize: 36,
                fontWeight: 500,
                color: 'var(--ou-text-bright)',
                textShadow: '0 0 40px rgba(255,255,255,0.15)',
              }}
            >
              OU
            </Text>
            <Text style={{ color: 'var(--ou-text-dimmed)', fontSize: 13 }}>Just talk.</Text>
          </Stack>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              padding: '12px 24px',
              borderRadius: 'var(--ou-radius-pill)',
              border: '0.5px solid var(--ou-border-subtle)',
              background: 'transparent',
              color: 'var(--ou-text-body)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'var(--ou-transition)',
              boxShadow: 'var(--ou-glow-xs)',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
                e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
                e.currentTarget.style.color = 'var(--ou-text-strong)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
              e.currentTarget.style.boxShadow = 'var(--ou-glow-xs)';
              e.currentTarget.style.color = 'var(--ou-text-body)';
            }}
          >
            <GoogleLogo size={20} />
            Google로 계속하기
          </button>

          {/* Divider */}
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <Box style={{ flex: 1, height: '0.5px', background: 'var(--ou-border-faint)' }} />
            <Text style={{ color: 'var(--ou-text-muted)', fontSize: 11 }}>또는</Text>
            <Box style={{ flex: 1, height: '0.5px', background: 'var(--ou-border-faint)' }} />
          </Box>

          {/* Mode toggle */}
          <Box
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: '0.5px solid var(--ou-border-faint)',
            }}
          >
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: mode === m ? '1.5px solid var(--ou-text-body)' : '1.5px solid transparent',
                  color: mode === m ? 'var(--ou-text-body)' : 'var(--ou-text-muted)',
                  fontSize: 13,
                  fontWeight: mode === m ? 600 : 400,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'var(--ou-transition)',
                }}
              >
                {m === 'login' ? '로그인' : '가입하기'}
              </button>
            ))}
          </Box>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="이메일"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                styles={inputStyles}
              />
              <PasswordInput
                label="비밀번호"
                placeholder={mode === 'signup' ? '6자 이상' : '비밀번호 입력'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                styles={inputStyles}
              />
              <button
                type="submit"
                disabled={loading || !email || !password}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: 'var(--ou-radius-pill)',
                  border: 'none',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#111',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
                  transition: 'var(--ou-transition)',
                  opacity: loading || !email || !password ? 0.4 : 1,
                  marginTop: 4,
                }}
                onMouseEnter={e => {
                  if (!loading && email && password) {
                    e.currentTarget.style.background = '#fff';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
                }}
              >
                {loading ? '...' : mode === 'signup' ? '가입하기' : '로그인'}
              </button>
            </Stack>
          </form>

          {mode === 'login' && (
            <Text size="xs" ta="center">
              <Anchor
                href="/forgot-password"
                style={{ color: 'var(--ou-text-dimmed)', fontSize: 12, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ou-text-body)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ou-text-dimmed)')}
              >
                비밀번호를 잊으셨나요?
              </Anchor>
            </Text>
          )}

          <Text style={{ color: 'var(--ou-text-muted)', fontSize: 11 }} ta="center">
            계속하면{' '}
            <Anchor
              href="/terms-agree"
              style={{ color: 'var(--ou-text-dimmed)', fontSize: 11, textDecoration: 'underline' }}
            >
              이용약관
            </Anchor>
            에 동의하는 것으로 간주합니다.
          </Text>
        </Stack>
      </Box>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Box style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-space)' }}>
        <Text style={{ color: 'var(--ou-text-dimmed)', fontSize: 13 }}>로딩 중...</Text>
      </Box>
    }>
      <LoginForm />
    </Suspense>
  );
}
