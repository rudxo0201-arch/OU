'use client';
import { useEffect, useState } from 'react';
import { Stack, Text, Center, Title, Button, Loader } from '@mantine/core';
import { CheckCircle } from '@phosphor-icons/react';

export default function VerifiedPage() {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/my';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Center h="100dvh">
      <Stack align="center" gap="lg" maw={360} p="xl">
        <CheckCircle size={56} weight="thin" color="var(--mantine-color-dark-6)" />
        <Title order={3} fw={600}>인증이 완료되었어요</Title>
        <Text c="dimmed" ta="center" fz="sm">
          이메일 인증이 성공적으로 완료되었어요.
          <br />잠시 후 자동으로 이동합니다.
        </Text>
        {countdown > 0 ? (
          <Loader size="sm" color="dark" />
        ) : (
          <Button variant="subtle" color="dark" onClick={() => { window.location.href = '/my'; }}>
            지금 이동하기
          </Button>
        )}
      </Stack>
    </Center>
  );
}
