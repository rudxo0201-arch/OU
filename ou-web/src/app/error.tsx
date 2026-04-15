'use client';

import { Center, Stack, Text, Button, Group } from '@mantine/core';
import { WarningCircle } from '@phosphor-icons/react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <Center h="100vh" px="xl">
      <Stack align="center" gap="lg" maw={400}>
        <WarningCircle size={48} weight="light" color="var(--mantine-color-gray-5)" />
        <Text fw={600} fz="lg" ta="center">
          문제가 발생했어요
        </Text>
        <Text fz="sm" c="dimmed" ta="center">
          일시적인 오류일 수 있어요. 다시 시도하거나 홈으로 돌아가 주세요.
        </Text>
        <Group gap="sm">
          <Button variant="light" color="gray" onClick={reset}>
            다시 시도
          </Button>
          <Button variant="subtle" color="gray" component={Link} href="/">
            홈으로
          </Button>
        </Group>
      </Stack>
    </Center>
  );
}
