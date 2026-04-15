'use client';

import { Box, Group, Text, Button, CloseButton } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';

interface SaveNudgeProps {
  trigger: 'turn_limit' | 'view_created';
  nodeCount?: number;
  onDismiss?: () => void;
}

const NUDGE_COPY: Record<string, string> = {
  turn_limit: '대화가 쌓이고 있어요. 저장하지 않으면 사라져요.',
  view_created: '저장하면 언제든 다시 볼 수 있어요.',
};

export function SaveNudge({ trigger, nodeCount, onDismiss }: SaveNudgeProps) {
  const router = useRouter();

  const handleSignup = () => {
    // 게스트 메시지를 localStorage에 백업 후 로그인 이동
    useChatStore.getState().persistGuest();
    router.push('/login?next=/chat');
  };

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
