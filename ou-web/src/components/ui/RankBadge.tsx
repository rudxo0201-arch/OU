'use client';

import { Group, Text, Progress, Stack, Tooltip, Box } from '@mantine/core';
import { getUserRank, getRankProgress, getNodesUntilNextRank } from '@/lib/utils/rank';

interface RankBadgeProps {
  nodeCount: number;
  /** compact: 사이드바용, full: 프로필/설정용 */
  variant?: 'compact' | 'full';
}

export function RankBadge({ nodeCount, variant = 'compact' }: RankBadgeProps) {
  const rank = getUserRank(nodeCount);
  const progress = getRankProgress(nodeCount);
  const remaining = getNodesUntilNextRank(nodeCount);

  if (variant === 'compact') {
    return (
      <Tooltip
        label={
          remaining > 0
            ? `${rank.description} · 다음 등급까지 ${remaining}개`
            : rank.description
        }
        position="right"
        multiline
        w={200}
      >
        <Group gap={6} wrap="nowrap" style={{ cursor: 'default' }}>
          <Text fz={14} lh={1}>{rank.emoji}</Text>
          <Box flex={1} style={{ minWidth: 0 }}>
            <Text fz={10} c="dimmed" lineClamp={1}>{rank.name}</Text>
            <Progress
              value={progress}
              size={3}
              color="gray"
              mt={2}
              radius="xl"
            />
          </Box>
        </Group>
      </Tooltip>
    );
  }

  // full variant
  return (
    <Stack gap={6}>
      <Group gap="xs" align="center">
        <Text fz={20} lh={1}>{rank.emoji}</Text>
        <Stack gap={0}>
          <Text fz="sm" fw={600}>{rank.name}</Text>
          <Text fz="xs" c="dimmed">{rank.nameEn}</Text>
        </Stack>
      </Group>
      <Text fz="xs" c="dimmed">{rank.description}</Text>
      <Stack gap={4}>
        <Progress value={progress} size="sm" color="gray" radius="xl" />
        <Group justify="space-between">
          <Text fz={10} c="dimmed">{nodeCount}개 기록</Text>
          {remaining > 0 ? (
            <Text fz={10} c="dimmed">다음 등급까지 {remaining}개</Text>
          ) : (
            <Text fz={10} c="dimmed">최고 등급 달성</Text>
          )}
        </Group>
      </Stack>
    </Stack>
  );
}
