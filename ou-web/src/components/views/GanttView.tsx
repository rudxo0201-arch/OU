'use client';

import { useMemo } from 'react';
import { Stack, Text, Box, Group } from '@mantine/core';
import type { ViewProps } from './registry';

interface GanttTask {
  id: string;
  title: string;
  start: number;
  end: number;
  progress: number;
}

export function GanttView({ nodes }: ViewProps) {
  const { tasks, minDate, maxDate, totalDays, todayOffset } = useMemo(() => {
    const now = Date.now();
    const parsed: GanttTask[] = nodes
      .map(n => {
        const sd = n.domain_data?.start_date;
        const ed = n.domain_data?.end_date;
        const start = sd ? new Date(sd).getTime() : now;
        const end = ed ? new Date(ed).getTime() : start + 86400000 * 7;
        return {
          id: n.id,
          title: n.domain_data?.title ?? ((n.raw ?? '').slice(0, 30) || 'Task'),
          start,
          end: Math.max(end, start + 86400000),
          progress: Math.min(100, Math.max(0, Number(n.domain_data?.progress) || 0)),
        };
      })
      .sort((a, b) => a.start - b.start);

    if (parsed.length === 0) return { tasks: [], minDate: 0, maxDate: 0, totalDays: 1, todayOffset: 0 };

    const min = Math.min(...parsed.map(t => t.start));
    const max = Math.max(...parsed.map(t => t.end));
    const days = Math.max(1, Math.ceil((max - min) / 86400000));
    const tOff = Math.max(0, Math.min(1, (now - min) / (max - min)));

    return { tasks: parsed, minDate: min, maxDate: max, totalDays: days, todayOffset: tOff };
  }, [nodes]);

  if (nodes.length === 0) return null;

  const BAR_H = 24;
  const ROW_H = 36;
  const LABEL_W = 140;
  const CHART_W = 500;

  return (
    <Stack gap={0} p="md">
      <Text fz="xs" c="dimmed" mb="md">Gantt</Text>

      {/* Header dates */}
      <Group gap={0} wrap="nowrap" mb={4}>
        <Box style={{ width: LABEL_W, flexShrink: 0 }} />
        <Box style={{ width: CHART_W, position: 'relative' }}>
          <Text fz={10} c="dimmed" style={{ position: 'absolute', left: 0 }}>
            {new Date(minDate).toLocaleDateString()}
          </Text>
          <Text fz={10} c="dimmed" style={{ position: 'absolute', right: 0 }}>
            {new Date(maxDate).toLocaleDateString()}
          </Text>
        </Box>
      </Group>

      <Box style={{ overflowX: 'auto' }}>
        <Box style={{ position: 'relative', minWidth: LABEL_W + CHART_W }}>
          {/* Today marker */}
          {todayOffset >= 0 && todayOffset <= 1 && (
            <Box
              style={{
                position: 'absolute',
                left: LABEL_W + todayOffset * CHART_W,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: 'var(--mantine-color-gray-6)',
                zIndex: 2,
              }}
            />
          )}

          {tasks.map((task, i) => {
            const range = maxDate - minDate || 1;
            const leftPct = (task.start - minDate) / range;
            const widthPct = (task.end - task.start) / range;

            return (
              <Group key={task.id} gap={0} wrap="nowrap" style={{ height: ROW_H }} align="center">
                {/* Label */}
                <Box style={{ width: LABEL_W, flexShrink: 0, paddingRight: 8 }}>
                  <Text fz={12} truncate fw={400}>
                    {task.title}
                  </Text>
                </Box>

                {/* Bar area */}
                <Box
                  style={{
                    width: CHART_W,
                    position: 'relative',
                    height: BAR_H,
                    backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--mantine-color-gray-0)',
                    borderRadius: 4,
                  }}
                >
                  {/* Background bar */}
                  <Box
                    style={{
                      position: 'absolute',
                      left: `${leftPct * 100}%`,
                      width: `${widthPct * 100}%`,
                      top: 4,
                      height: BAR_H - 8,
                      backgroundColor: 'var(--mantine-color-gray-3)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Progress fill */}
                    {task.progress > 0 && (
                      <Box
                        style={{
                          width: `${task.progress}%`,
                          height: '100%',
                          backgroundColor: 'var(--mantine-color-gray-6)',
                          borderRadius: 3,
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Group>
            );
          })}
        </Box>
      </Box>
    </Stack>
  );
}
