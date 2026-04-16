'use client';

import { Box, Group, Text, Button, CloseButton, Stack, Overlay } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { Warning } from '@phosphor-icons/react';

interface SaveNudgeProps {
  trigger: 'turn_limit' | 'view_created' | 'session_end';
  nodeCount?: number;
  onDismiss?: () => void;
}

const NUDGE_COPY: Record<string, string> = {
  turn_limit: '이 데이터를 저장하고 계속 쌓아보세요.',
  view_created: '가입하면 이 뷰를 저장하고 언제든 다시 볼 수 있어요.',
  session_end: '잠깐! 지금까지 나눈 대화가 사라져요.',
};

export function SaveNudge({ trigger, nodeCount, onDismiss }: SaveNudgeProps) {
  const router = useRouter();

  const handleSignup = () => {
    // 게스트 메시지를 localStorage에 백업 후 로그인 이동
    useChatStore.getState().persistGuest();
    router.push('/login?next=/chat');
  };

  // session_end: 풀스크린 모달
  if (trigger === 'session_end') {
    return (
      <Box
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Overlay color="#000" backgroundOpacity={0.7} zIndex={1000} />
        <Box
          p="xl"
          style={{
            position: 'relative',
            zIndex: 1001,
            maxWidth: 400,
            width: '90%',
            background: 'var(--mantine-color-body)',
            border: '0.5px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-lg)',
          }}
        >
          <Stack align="center" gap="lg">
            <Warning size={40} weight="light" color="var(--mantine-color-gray-5)" />
            <Text fw={600} fz="lg" ta="center">
              {NUDGE_COPY.session_end}
            </Text>
            {nodeCount != null && nodeCount > 0 && (
              <Text fz="sm" c="dimmed" ta="center">
                지금까지 쌓인 기록 {nodeCount}개가 모두 사라져요.
              </Text>
            )}
            <Text fz="sm" c="dimmed" ta="center">
              가입하면 모든 기록이 저장돼요.
            </Text>
            <Stack gap="xs" w="100%">
              <Button
                fullWidth
                variant="filled"
                color="dark"
                onClick={handleSignup}
              >
                가입하기
              </Button>
              {onDismiss && (
                <Button
                  fullWidth
                  variant="subtle"
                  color="gray"
                  onClick={onDismiss}
                >
                  나중에
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      px="md"
      py="sm"
      style={{
        borderTop: trigger === 'turn_limit' ? '0.5px solid var(--mantine-color-default-border)' : undefined,
        border: trigger === 'view_created' ? '0.5px solid var(--mantine-color-default-border)' : undefined,
        borderRadius: trigger === 'view_created' ? 'var(--mantine-radius-md)' : undefined,
        background: 'var(--mantine-color-body)',
        ...(trigger === 'turn_limit' ? { position: 'sticky' as const, top: 0, zIndex: 10 } : {}),
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Text fz="sm" c="dimmed" style={{ flex: 1 }}>
          {NUDGE_COPY[trigger]}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <Button size="xs" variant="filled" color="dark" onClick={handleSignup}>
            가입하기
          </Button>
          {onDismiss && (
            <CloseButton size="sm" onClick={onDismiss} />
          )}
        </Group>
      </Group>
    </Box>
  );
}
