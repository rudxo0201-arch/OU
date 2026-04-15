'use client';

import { useMemo } from 'react';
import { Stack, Text, Box, Group } from '@mantine/core';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
}

export function TimelineView({ nodes }: ViewProps) {
  const items: TimelineItem[] = useMemo(
    () =>
      nodes
        .map(n => ({
          id: n.id,
          date: n.domain_data?.date ?? n.created_at ?? '',
          title: n.domain_data?.title ?? ((n.raw ?? '').slice(0, 40) || '항목'),
          description: n.domain_data?.description ?? n.domain_data?.content ?? n.raw ?? '',
        }))
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [nodes],
  );

  if (items.length === 0) return null;

  return (
    <Stack gap={0} p="md">
      <Text fz="xs" c="dimmed" mb="md">타임라인</Text>

      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Group key={item.id} gap="md" align="flex-start" wrap="nowrap">
            {/* Date column */}
            <Box style={{ width: 72, flexShrink: 0, textAlign: 'right', paddingTop: 2 }}>
              {item.date && (
                <>
                  <Text fz={11} fw={500} lh={1.2}>
                    {dayjs(item.date).format('M월 D일')}
                  </Text>
                  <Text fz={9} c="dimmed">
                    {dayjs(item.date).format('YYYY')}
                  </Text>
                </>
              )}
            </Box>

            {/* Dot + Line */}
            <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <Box
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: i === 0 ? 'var(--mantine-color-text)' : 'var(--mantine-color-gray-5)',
                  marginTop: 4,
                  flexShrink: 0,
                }}
              />
              {!isLast && (
                <Box
                  style={{
                    width: 1,
                    flex: 1,
                    minHeight: 32,
                    backgroundColor: 'var(--mantine-color-default-border)',
                  }}
                />
              )}
            </Box>

            {/* Content */}
            <Box style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
              <Text fz="sm" fw={500} lh={1.4}>
                {item.title}
              </Text>
              {item.description && item.description !== item.title && (
                <Text fz="xs" c="dimmed" mt={2} lineClamp={3} style={{ lineHeight: 1.5 }}>
                  {item.description}
                </Text>
              )}
            </Box>
          </Group>
        );
      })}
    </Stack>
  );
}
