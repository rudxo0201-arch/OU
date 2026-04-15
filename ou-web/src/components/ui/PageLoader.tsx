'use client';

import { Center, Stack, Text } from '@mantine/core';
import { OULoader } from './OULoader';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = '불러오는 중...' }: PageLoaderProps) {
  return (
    <Center h="60vh">
      <Stack align="center" gap="xl">
        <OULoader variant="ripple" size="lg" />
        <Text fz="sm" c="dimmed">{message}</Text>
      </Stack>
    </Center>
  );
}
