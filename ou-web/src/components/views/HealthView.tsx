'use client';

import { useMemo } from 'react';
import {
  Box, Group, Text, Stack, Button, Divider,
} from '@mantine/core';
import { Printer } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

const CELL_SIZE = 12;
const CELL_GAP = 2;
const WEEKS = 24; // 6 months
const DAYS = 7;

interface HealthEntry {
  id: string;
  date: string;
  symptom: string;
  severity: string;
  bodyPart: string;
  memo: string;
}

export function HealthView({ nodes }: ViewProps) {
  const entries: HealthEntry[] = useMemo(
    () =>
      nodes
        .map(n => {
          const dd = n.domain_data ?? {};
          return {
            id: n.id,
            date: dd.date ?? n.created_at ?? '',
            symptom: dd.symptom ?? dd.title ?? '',
            severity: dd.severity ?? '',
            bodyPart: dd.body_part ?? dd.bodyPart ?? '',
            memo: dd.memo ?? dd.content ?? n.raw ?? '',
          };
        })
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [nodes],
  );

  // Heatmap data
  const dateCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (!e.date) continue;
      const key = dayjs(e.date).format('YYYY-MM-DD');
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [entries]);

  const maxCount = useMemo(
    () => Math.max(...Object.values(dateCounts), 1),
    [dateCounts],
  );

  const today = dayjs();
  const startDate = today.subtract(WEEKS * 7 - 1, 'day');
  const gridStart = startDate.subtract(startDate.day(), 'day');

  const getIntensity = (count: number): string => {
    if (count === 0) return 'var(--mantine-color-gray-1)';
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'var(--mantine-color-gray-3)';
    if (ratio <= 0.5) return 'var(--mantine-color-gray-5)';
    if (ratio <= 0.75) return 'var(--mantine-color-gray-7)';
    return 'var(--mantine-color-dark-6)';
  };

  const monthLabels = useMemo(() => {
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

  // Symptom frequency
  const symptomFrequency = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (!e.symptom) continue;
      map[e.symptom] = (map[e.symptom] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [entries]);

  const maxSymptomCount = useMemo(
    () => Math.max(...symptomFrequency.map(([, c]) => c), 1),
    [symptomFrequency],
  );

  const svgWidth = WEEKS * (CELL_SIZE + CELL_GAP) + 28;
  const svgHeight = DAYS * (CELL_SIZE + CELL_GAP) + 20;

  const handlePrint = () => {
    window.print();
  };

  if (entries.length === 0) return null;

  return (
    <Stack gap="lg" p="md" className="health-view-print">
      {/* Monthly Heatmap */}
      <Box>
        <Group justify="space-between" align="baseline" mb="xs">
          <Text fz="sm" fw={600}>기록 현황</Text>
          <Text fz="xs" c="dimmed">{entries.length}건</Text>
        </Group>
        <Box style={{ overflowX: 'auto' }}>
          <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
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
                    <title>{`${key}: ${count}건`}</title>
                  </rect>
                );
              }),
            )}
          </svg>
        </Box>
      </Box>

      <Divider color="var(--mantine-color-default-border)" />

      {/* Symptom Frequency */}
      {symptomFrequency.length > 0 && (
        <Box>
          <Text fz="sm" fw={600} mb="sm">자주 기록된 증상</Text>
          <Stack gap={6}>
            {symptomFrequency.map(([symptom, count]) => (
              <Group key={symptom} gap="sm" wrap="nowrap">
                <Text fz="xs" style={{ width: 80, flexShrink: 0 }} lineClamp={1}>
                  {symptom}
                </Text>
                <Box style={{ flex: 1, position: 'relative', height: 16 }}>
                  <Box
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${(count / maxSymptomCount) * 100}%`,
                      backgroundColor: 'var(--mantine-color-gray-5)',
                      borderRadius: 4,
                      transition: 'width 300ms ease',
                    }}
                  />
                </Box>
                <Text fz={10} c="dimmed" style={{ width: 24, textAlign: 'right', flexShrink: 0 }}>
                  {count}
                </Text>
              </Group>
            ))}
          </Stack>
        </Box>
      )}

      <Divider color="var(--mantine-color-default-border)" />

      {/* Timeline */}
      <Box>
        <Text fz="sm" fw={600} mb="sm">기록 목록</Text>
        <Stack gap={4}>
          {entries.slice(0, 30).map(entry => (
            <Group
              key={entry.id}
              px="sm"
              py="xs"
              gap="sm"
              wrap="nowrap"
              style={{
                border: '0.5px solid var(--mantine-color-default-border)',
                borderRadius: 8,
              }}
            >
              <Text fz={10} c="dimmed" style={{ width: 64, flexShrink: 0 }}>
                {entry.date ? dayjs(entry.date).format('MM.DD') : ''}
              </Text>
              <Text fz="xs" fw={500} style={{ flexShrink: 0 }}>
                {entry.symptom || '기록'}
              </Text>
              {entry.severity && (
                <Text fz={10} c="dimmed">
                  {entry.severity}
                </Text>
              )}
              {entry.bodyPart && (
                <Text fz={10} c="dimmed">
                  {entry.bodyPart}
                </Text>
              )}
              <Text fz="xs" c="dimmed" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
                {entry.memo}
              </Text>
            </Group>
          ))}
        </Stack>
      </Box>

      {/* Print button */}
      <Button
        variant="outline"
        color="gray"
        size="sm"
        leftSection={<Printer size={16} />}
        onClick={handlePrint}
      >
        병원 방문용 요약
      </Button>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .health-view-print, .health-view-print * { visibility: visible; }
          .health-view-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
          }
          .health-view-print button { display: none !important; }
        }
      `}</style>
    </Stack>
  );
}
