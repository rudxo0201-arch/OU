'use client';

import { useMemo } from 'react';
import { Stack, Text, Box, Divider, Group } from '@mantine/core';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood?: string;
}

export function JournalView({ nodes }: ViewProps) {
  const entries: JournalEntry[] = useMemo(
    () =>
      nodes
        .map(n => ({
          id: n.id,
          date: n.domain_data?.date ?? n.created_at ?? '',
          title: n.domain_data?.title ?? '',
          content: n.domain_data?.content ?? n.raw ?? '',
          mood: n.domain_data?.mood ?? n.domain_data?.emotion,
        }))
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [nodes],
  );

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    for (const entry of entries) {
      const key = entry.date ? dayjs(entry.date).format('YYYY-MM-DD') : '날짜 없음';
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    return Object.entries(map);
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <Stack gap="lg" p="md">
      {grouped.map(([dateKey, dayEntries], gi) => (
        <Box key={dateKey}>
          {gi > 0 && <Divider mb="md" color="var(--mantine-color-default-border)" />}

          <Group gap="xs" mb="sm">
            <Text fz="sm" fw={600}>
              {dateKey === '날짜 없음'
                ? dateKey
                : dayjs(dateKey).format('M월 D일 dddd')}
            </Text>
          </Group>

          <Stack gap="md" pl="sm" style={{ borderLeft: '1px solid var(--mantine-color-default-border)' }}>
            {dayEntries.map(entry => (
              <Box key={entry.id} pl="md">
                {entry.mood && (
                  <Text fz="xs" c="dimmed" mb={2}>
                    {entry.mood}
                  </Text>
                )}
                {entry.title && (
                  <Text fz="sm" fw={500} mb={4}>
                    {entry.title}
                  </Text>
                )}
                <Text
                  fz="sm"
                  style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
                >
                  {entry.content}
                </Text>
                {entry.date && (
                  <Text fz={10} c="dimmed" mt={4}>
                    {dayjs(entry.date).format('A h:mm')}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
