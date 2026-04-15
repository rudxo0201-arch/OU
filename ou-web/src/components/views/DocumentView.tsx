'use client';

import { useMemo } from 'react';
import { Stack, Text, Box, Divider, Group, Title } from '@mantine/core';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

interface DocEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  domain: string;
}

/** 기록을 깔끔한 문서 형태로 렌더링합니다. 학습 노트, 회의록, 일기 등에 적합합니다. */
export function DocumentView({ nodes }: ViewProps) {
  const entries: DocEntry[] = useMemo(
    () =>
      nodes
        .map(n => ({
          id: n.id,
          date: n.domain_data?.date ?? n.created_at ?? '',
          title: n.domain_data?.title ?? '',
          content: n.domain_data?.content ?? n.domain_data?.description ?? n.raw ?? '',
          domain: n.domain ?? '',
        }))
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [nodes],
  );

  // 날짜별 그룹핑
  const grouped = useMemo(() => {
    const map: Record<string, DocEntry[]> = {};
    for (const entry of entries) {
      const key = entry.date ? dayjs(entry.date).format('YYYY-MM-DD') : '날짜 없음';
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    return Object.entries(map);
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <Stack
      gap="xl"
      p="lg"
      className="document-view"
      style={{
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      {/* 인쇄용 스타일 */}
      <style>{`
        @media print {
          .document-view {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .document-view .no-print {
            display: none !important;
          }
        }
      `}</style>

      {grouped.map(([dateKey, dayEntries], gi) => (
        <Box key={dateKey}>
          {gi > 0 && <Divider mb="lg" color="var(--mantine-color-default-border)" />}

          {/* 날짜 헤더 */}
          <Group gap="xs" mb="md">
            <Title order={4} fw={600} style={{ color: 'var(--mantine-color-text)' }}>
              {dateKey === '날짜 없음'
                ? dateKey
                : dayjs(dateKey).format('YYYY년 M월 D일 dddd')}
            </Title>
          </Group>

          {/* 해당 날짜의 기록들 */}
          <Stack gap="lg">
            {dayEntries.map(entry => (
              <Box
                key={entry.id}
                pl="md"
                style={{
                  borderLeft: '2px solid var(--mantine-color-gray-3)',
                }}
              >
                {entry.title && (
                  <Text fz="md" fw={600} mb={6} style={{ color: 'var(--mantine-color-text)' }}>
                    {entry.title}
                  </Text>
                )}
                <Text
                  fz="sm"
                  style={{
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    color: 'var(--mantine-color-text)',
                  }}
                >
                  {entry.content}
                </Text>
                {entry.date && (
                  <Text fz={10} c="dimmed" mt={6}>
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
