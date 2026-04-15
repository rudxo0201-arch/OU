'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Stack, TextInput, PasswordInput, Button, Divider, Text, Paper, Center, Title, Anchor, Tabs
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
      notifications.show({ message: 'Google 로그인에 실패했어요. 잠시 후 다시 시도해주세요.', color: 'red' });
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
      <Center h="100dvh">
        <Stack align="center" gap="md" maw={360} p="xl">
          <Title order={3}>이메일 인증이 필요해요</Title>
          <Text c="dimmed" ta="center" fz="sm">
            <strong>{email}</strong>로 보낸 인증 메일을 확인해주세요.
            <br />인증이 완료되면 자동으로 이동합니다.
          </Text>
          <Button variant="subtle" onClick={() => setNeedVerify(false)}>
            로그인으로 돌아가기
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Center h="100dvh">
      <Paper w={380} p="xl" radius="lg">
        <Stack gap="lg">
          <Stack gap={4} align="center">
            <Title order={2} fw={700}>OU</Title>
            <Text c="dimmed" size="sm">Just talk.</Text>
          </Stack>

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

          <Tabs value={mode} onChange={v => setMode(v as 'login' | 'signup')}>
            <Tabs.List grow>
              <Tabs.Tab value="login">로그인</Tabs.Tab>
              <Tabs.Tab value="signup">회원가입</Tabs.Tab>
            </Tabs.List>
          </Tabs>

          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="이메일"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <PasswordInput
                label="비밀번호"
                placeholder={mode === 'signup' ? '6자 이상' : '비밀번호 입력'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Button
                type="submit"
                variant="filled"
                fullWidth
                loading={loading}
                disabled={!email || !password}
              >
                {mode === 'signup' ? '회원가입' : '로그인'}
              </Button>
            </Stack>
          </form>

          {mode === 'login' && (
            <Text size="xs" ta="center">
              <Anchor size="xs" href="/forgot-password">비밀번호를 잊으셨나요?</Anchor>
            </Text>
          )}

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

export default function LoginPage() {
  return (
    <Suspense fallback={<Center h="100dvh"><Text>로딩 중...</Text></Center>}>
      <LoginForm />
    </Suspense>
  );
}
