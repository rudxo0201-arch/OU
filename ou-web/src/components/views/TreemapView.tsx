'use client';

import { useMemo } from 'react';
import { Stack, Text, Box } from '@mantine/core';
import type { ViewProps } from './registry';

interface TreemapRect {
  domain: string;
  count: number;
  nodes: { id: string; title: string }[];
  x: number;
  y: number;
  w: number;
  h: number;
}

function layoutTreemap(groups: { domain: string; count: number; nodes: { id: string; title: string }[] }[], width: number, height: number): TreemapRect[] {
  const total = groups.reduce((s, g) => s + g.count, 0);
  if (total === 0) return [];

  const rects: TreemapRect[] = [];
  let x = 0;
  let y = 0;
  let remainW = width;
  let remainH = height;
  let remainTotal = total;
  let horizontal = width >= height;

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const ratio = g.count / remainTotal;

    let rw: number, rh: number;
    if (horizontal) {
      rw = i === groups.length - 1 ? remainW : Math.round(remainW * ratio);
      rh = remainH;
    } else {
      rw = remainW;
      rh = i === groups.length - 1 ? remainH : Math.round(remainH * ratio);
    }

    rects.push({ ...g, x, y, w: Math.max(rw, 1), h: Math.max(rh, 1) });

    remainTotal -= g.count;
    if (horizontal) {
      x += rw;
      remainW -= rw;
    } else {
      y += rh;
      remainH -= rh;
    }
    horizontal = !horizontal;
  }

  return rects;
}

const GRAYS = [
  'var(--mantine-color-gray-1)',
  'var(--mantine-color-gray-2)',
  'var(--mantine-color-gray-3)',
  'var(--mantine-color-gray-1)',
  'var(--mantine-color-gray-2)',
];

export function TreemapView({ nodes }: ViewProps) {
  const rects = useMemo(() => {
    const domainMap = new Map<string, { id: string; title: string }[]>();
    for (const n of nodes) {
      const d = n.domain ?? n.domain_data?.domain ?? 'default';
      if (!domainMap.has(d)) domainMap.set(d, []);
      domainMap.get(d)!.push({
        id: n.id,
        title: n.domain_data?.title ?? ((n.raw ?? '').slice(0, 20) || 'Untitled'),
      });
    }

    const groups = Array.from(domainMap.entries())
      .map(([domain, items]) => ({ domain, count: items.length, nodes: items }))
      .sort((a, b) => b.count - a.count);

    return layoutTreemap(groups, 600, 400);
  }, [nodes]);

  if (nodes.length === 0) return null;

  return (
    <Stack gap={0} p="md">
      <Text fz="xs" c="dimmed" mb="md">Treemap</Text>

      <Box style={{ position: 'relative', width: 600, height: 400, maxWidth: '100%', overflow: 'hidden' }}>
        {rects.map((r, i) => (
          <Box
            key={r.domain}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              backgroundColor: GRAYS[i % GRAYS.length],
              border: '0.5px solid var(--mantine-color-default-border)',
              borderRadius: 2,
              padding: 6,
              overflow: 'hidden',
            }}
          >
            <Text fz={11} fw={600} truncate mb={2}>
              {r.domain} ({r.count})
            </Text>

            {r.h > 40 && (
              <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {r.nodes.slice(0, Math.floor((r.w * r.h) / 1200)).map(n => (
                  <Box
                    key={n.id}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      borderRadius: 3,
                      padding: '2px 5px',
                      maxWidth: r.w - 16,
                    }}
                  >
                    <Text fz={9} truncate>
                      {n.title}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
