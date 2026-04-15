'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, PasswordInput, Button, Text, Paper, Center, Title } from '@mantine/core';
import { createClient } from '@/lib/supabase/client';
import { notifications } from '@mantine/notifications';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      notifications.show({ message: '비밀번호는 6자 이상이어야 해요', color: 'gray' });
      return;
    }
    if (password !== confirm) {
      notifications.show({ message: '비밀번호가 일치하지 않아요', color: 'gray' });
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      notifications.show({ message: '비밀번호 변경에 실패했어요. 다시 시도해주세요.', color: 'gray' });
    } else {
      notifications.show({ message: '비밀번호가 변경되었어요', color: 'green' });
      router.push('/my');
    }
    setLoading(false);
  }

  return (
    <Center h="100dvh">
      <Paper w={380} p="xl" radius="lg">
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <Stack gap={4} align="center">
              <Title order={2} fw={700}>새 비밀번호 설정</Title>
              <Text c="dimmed" size="sm">새로운 비밀번호를 입력해주세요</Text>
            </Stack>
            <PasswordInput
              label="새 비밀번호"
              placeholder="6자 이상"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <PasswordInput
              label="비밀번호 확인"
              placeholder="한번 더 입력"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" fullWidth loading={loading} disabled={!password || !confirm}>
              비밀번호 변경
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
