'use client';

import { useMemo } from 'react';
import { Box, Stack, Text, Group } from '@mantine/core';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

const CELL_SIZE = 12;
const CELL_GAP = 2;
const WEEKS = 52;
const DAYS = 7;
const DAY_LABELS = ['', '월', '', '수', '', '금', ''];

export function HeatmapView({ nodes }: ViewProps) {
  const dateCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of nodes) {
      const date = n.domain_data?.date ?? n.created_at;
      if (!date) continue;
      const key = dayjs(date).format('YYYY-MM-DD');
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [nodes]);

  const maxCount = useMemo(
    () => Math.max(...Object.values(dateCounts), 1),
    [dateCounts],
  );

  const totalDays = useMemo(
    () => Object.keys(dateCounts).length,
    [dateCounts],
  );

  const streak = useMemo(() => {
    let count = 0;
    let d = dayjs();
    while (dateCounts[d.format('YYYY-MM-DD')]) {
      count++;
      d = d.subtract(1, 'day');
    }
    return count;
  }, [dateCounts]);

  const today = dayjs();
  const startDate = today.subtract(WEEKS * 7 - 1, 'day');
  // Adjust to start on Sunday
  const gridStart = startDate.subtract(startDate.day(), 'day');

  const getIntensity = (count: number): string => {
    if (count === 0) return 'var(--mantine-color-gray-1)';
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'var(--mantine-color-gray-3)';
    if (ratio <= 0.5) return 'var(--mantine-color-gray-5)';
    if (ratio <= 0.75) return 'var(--mantine-color-gray-7)';
    return 'var(--mantine-color-dark-6)';
  };

  // Generate month labels
  const monthLabels: { label: string; week: number }[] = useMemo(() => {
    const labels: { label: string; week: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const d = gridStart.add(w * 7, 'day');
      const m = d.month();
      if (m !== lastMonth) {
        labels.push({ label: d.format('M월'), week: w });
        lastMonth = m;
      }
    }
    return labels;
  }, [gridStart]);

  const svgWidth = WEEKS * (CELL_SIZE + CELL_GAP) + 28;
  const svgHeight = DAYS * (CELL_SIZE + CELL_GAP) + 20;

  return (
    <Stack gap="sm" p="md">
      <Group justify="space-between" align="baseline">
        <Text fz="sm" fw={600}>활동 기록</Text>
        <Group gap="sm">
          {streak > 0 && <Text fz="xs" fw={600}>{streak}일 연속</Text>}
          <Text fz="xs" c="dimmed">{totalDays}일 기록됨</Text>
        </Group>
      </Group>

      <Box style={{ overflowX: 'auto' }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
          {/* Month labels */}
          {monthLabels.map(({ label, week }) => (
            <text
              key={`month-${week}`}
              x={28 + week * (CELL_SIZE + CELL_GAP)}
              y={10}
              fontSize={9}
              fill="currentColor"
              opacity={0.5}
            >
              {label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            label && (
              <text
                key={`day-${i}`}
                x={0}
                y={20 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2}
                fontSize={9}
                fill="currentColor"
                opacity={0.5}
              >
                {label}
              </text>
            )
          ))}

          {/* Cells */}
          {Array.from({ length: WEEKS }, (_, w) =>
            Array.from({ length: DAYS }, (_, d) => {
              const cellDate = gridStart.add(w * 7 + d, 'day');
              if (cellDate.isAfter(today)) return null;
              const key = cellDate.format('YYYY-MM-DD');
              const count = dateCounts[key] ?? 0;
              return (
                <rect
                  key={key}
                  x={28 + w * (CELL_SIZE + CELL_GAP)}
                  y={16 + d * (CELL_SIZE + CELL_GAP)}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill={getIntensity(count)}
                >
                  <title>{`${key}: ${count}회`}</title>
                </rect>
              );
            }),
          )}
        </svg>
      </Box>

      {/* Legend */}
      <Group gap={4} justify="flex-end">
        <Text fz={9} c="dimmed">적음</Text>
        {['var(--mantine-color-gray-1)', 'var(--mantine-color-gray-3)', 'var(--mantine-color-gray-5)', 'var(--mantine-color-gray-7)', 'var(--mantine-color-dark-6)'].map(
          (color, i) => (
            <Box
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: color,
              }}
            />
          ),
        )}
        <Text fz={9} c="dimmed">많음</Text>
      </Group>
    </Stack>
  );
}
