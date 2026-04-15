'use client';
import { useState } from 'react';
import { Stack, TextInput, Button, Text, Paper, Center, Title, Anchor } from '@mantine/core';
import { createClient } from '@/lib/supabase/client';
import { notifications } from '@mantine/notifications';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      notifications.show({ message: '요청에 실패했어요. 다시 시도해주세요.', color: 'gray' });
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <Center h="100dvh">
        <Stack align="center" gap="md" maw={360} p="xl">
          <Title order={3}>메일을 확인해주세요</Title>
          <Text c="dimmed" ta="center" fz="sm">
            <strong>{email}</strong>로 비밀번호 재설정 링크를 보냈어요.
          </Text>
          <Anchor size="sm" href="/login">로그인으로 돌아가기</Anchor>
        </Stack>
      </Center>
    );
  }

  return (
    <Center h="100dvh">
      <Paper w={380} p="xl" radius="lg">
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <Stack gap={4} align="center">
              <Title order={2} fw={700}>비밀번호 찾기</Title>
              <Text c="dimmed" size="sm">가입한 이메일을 입력해주세요</Text>
            </Stack>
            <TextInput
              label="이메일"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Button type="submit" fullWidth loading={loading} disabled={!email}>
              재설정 메일 보내기
            </Button>
            <Text size="xs" ta="center">
              <Anchor size="xs" href="/login">로그인으로 돌아가기</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
