'use client';

import { useMemo } from 'react';
import { Box, Stack, Text, Group, Paper } from '@mantine/core';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

const CATEGORIES = ['식비', '교통', '쇼핑', '문화', '의료', '교육', '기타'] as const;

interface SpendingItem {
  amount: number;
  category: string;
  date: string;
}

export function ChartView({ nodes }: ViewProps) {
  const items: SpendingItem[] = useMemo(
    () => {
      const result: SpendingItem[] = [];
      for (const n of nodes) {
        if (!n.domain_data) continue;
        // 다건 items 배열 지원
        if (Array.isArray(n.domain_data.items)) {
          for (const it of n.domain_data.items) {
            result.push({
              amount: Number(it.amount) || 0,
              category: it.category ?? '기타',
              date: n.domain_data.date ?? '',
            });
          }
        } else if (n.domain_data.amount != null) {
          result.push({
            amount: Number(n.domain_data.amount) || 0,
            category: n.domain_data.category ?? '기타',
            date: n.domain_data.date ?? '',
          });
        }
      }
      return result;
    },
    [nodes],
  );

  const totalAmount = useMemo(
    () => items.reduce((sum, it) => sum + it.amount, 0),
    [items],
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of CATEGORIES) map[cat] = 0;
    for (const it of items) {
      const cat = CATEGORIES.includes(it.category as any) ? it.category : '기타';
      map[cat] = (map[cat] ?? 0) + it.amount;
    }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [items]);

  const maxAmount = useMemo(
    () => Math.max(...byCategory.map(([, v]) => v), 1),
    [byCategory],
  );

  const currentMonth = useMemo(() => {
    const dates = items.filter(it => it.date).map(it => dayjs(it.date));
    if (dates.length === 0) return dayjs().format('YYYY년 M월');
    return dates[0].format('YYYY년 M월');
  }, [items]);

  if (items.length === 0) return null;

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between" align="baseline">
        <Text fz="sm" fw={600}>{currentMonth} 지출</Text>
        <Text fz="lg" fw={700}>{totalAmount.toLocaleString()}원</Text>
      </Group>

      <Stack gap="sm">
        {byCategory.map(([category, amount]) => {
          const ratio = amount / maxAmount;
          const percent = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0';
          return (
            <Paper key={category} p="xs" style={{ border: 'none' }}>
              <Group justify="space-between" mb={4}>
                <Text fz="xs" fw={500}>{category}</Text>
                <Text fz="xs" c="dimmed">{amount.toLocaleString()}원 ({percent}%)</Text>
              </Group>
              <Box
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'var(--mantine-color-gray-2)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  style={{
                    height: '100%',
                    width: `${ratio * 100}%`,
                    borderRadius: 4,
                    backgroundColor: 'var(--mantine-color-dark-4)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Paper>
          );
        })}
      </Stack>

      {byCategory.length === 0 && (
        <Text fz="xs" c="dimmed" ta="center" py="lg">기록된 지출이 없습니다</Text>
      )}
    </Stack>
  );
}
