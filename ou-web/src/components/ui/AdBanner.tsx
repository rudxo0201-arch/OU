'use client';

import { Box, Text } from '@mantine/core';

interface AdBannerProps {
  position: 'feed' | 'view_bottom';
  plan: 'free' | 'pro' | 'team';
}

export function AdBanner({ position, plan }: AdBannerProps) {
  if (plan !== 'free') return null;

  return (
    <Box
      p="sm"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        opacity: 0.7,
      }}
    >
      <Text fz={10} c="dimmed" mb={4}>광고</Text>
      <Text fz="sm" c="dimmed">광고 영역</Text>
    </Box>
  );
}
