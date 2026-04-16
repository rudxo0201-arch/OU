'use client';

import { useMemo } from 'react';
import { Stack, Text, Box, SimpleGrid } from '@mantine/core';
import type { ViewProps } from './registry';

interface MatrixItem {
  id: string;
  title: string;
  quadrant: number; // 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
}

const QUADRANT_LABELS = [
  { label: 'Important & Urgent', row: 0, col: 0 },
  { label: 'Important & Not Urgent', row: 0, col: 1 },
  { label: 'Not Important & Urgent', row: 1, col: 0 },
  { label: 'Not Important & Not Urgent', row: 1, col: 1 },
];

function getQuadrant(node: any): number {
  const d = node.domain_data ?? {};
  const importance = Number(d.importance ?? (d.priority === 'high' || d.priority === 'urgent' ? 1 : 0));
  const urgency = Number(d.urgency ?? (d.priority === 'urgent' ? 1 : 0));

  if (importance >= 0.5 && urgency >= 0.5) return 0;
  if (importance >= 0.5 && urgency < 0.5) return 1;
  if (importance < 0.5 && urgency >= 0.5) return 2;
  return 3;
}

export function MatrixView({ nodes }: ViewProps) {
  const quadrants = useMemo(() => {
    const buckets: MatrixItem[][] = [[], [], [], []];
    for (const n of nodes) {
      const q = getQuadrant(n);
      buckets[q].push({
        id: n.id,
        title: n.domain_data?.title ?? ((n.raw ?? '').slice(0, 30) || 'Item'),
        quadrant: q,
      });
    }
    return buckets;
  }, [nodes]);

  if (nodes.length === 0) return null;

  return (
    <Stack gap={0} p="md">
      <Text fz="xs" c="dimmed" mb="md">Matrix</Text>

      {/* Axis labels */}
      <Box style={{ position: 'relative' }}>
        <Text fz={10} c="dimmed" ta="center" mb={4}>
          ← Urgent &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Not Urgent →
        </Text>

        <SimpleGrid cols={2} spacing={1}>
          {QUADRANT_LABELS.map((q, i) => (
            <Box
              key={i}
              style={{
                border: '0.5px solid var(--mantine-color-default-border)',
                borderRadius: 4,
                padding: 12,
                minHeight: 140,
              }}
            >
              <Text fz={10} c="dimmed" fw={500} mb={8}>
                {q.label}
              </Text>

              <Stack gap={4}>
                {quadrants[i].map(item => (
                  <Box
                    key={item.id}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '0.5px solid var(--mantine-color-default-border)',
                    }}
                  >
                    <Text fz={12} truncate>
                      {item.title}
                    </Text>
                  </Box>
                ))}
                {quadrants[i].length === 0 && (
                  <Text fz={11} c="dimmed" fs="italic">
                    No items
                  </Text>
                )}
              </Stack>
            </Box>
          ))}
        </SimpleGrid>

        <Text fz={10} c="dimmed" ta="center" mt={4}>
          ↑ Important &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Not Important ↓
        </Text>
      </Box>
    </Stack>
  );
}
