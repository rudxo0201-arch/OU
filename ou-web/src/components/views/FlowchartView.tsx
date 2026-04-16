'use client';

import { useMemo } from 'react';
import { Stack, Text, Box } from '@mantine/core';
import type { ViewProps } from './registry';

interface FlowNode {
  id: string;
  title: string;
  nextId?: string;
}

const NODE_W = 200;
const NODE_H = 48;
const GAP_Y = 60;
const PAD_X = 40;

export function FlowchartView({ nodes }: ViewProps) {
  const flowNodes: FlowNode[] = useMemo(() => {
    const ordered: FlowNode[] = nodes.map((n, i) => ({
      id: n.id,
      title: n.domain_data?.title ?? ((n.raw ?? '').slice(0, 40) || 'Step'),
      nextId: n.domain_data?.next ?? (i < nodes.length - 1 ? nodes[i + 1].id : undefined),
    }));
    return ordered;
  }, [nodes]);

  if (nodes.length === 0) return null;

  const svgW = NODE_W + PAD_X * 2;
  const svgH = flowNodes.length * (NODE_H + GAP_Y) - GAP_Y + PAD_X * 2;
  const cx = svgW / 2;

  return (
    <Stack gap={0} p="md">
      <Text fz="xs" c="dimmed" mb="md">Flowchart</Text>

      <Box style={{ overflowX: 'auto' }}>
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: 'block', margin: '0 auto' }}
        >
          <defs>
            <marker
              id="fc-arrow"
              viewBox="0 0 10 7"
              refX="10"
              refY="3.5"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--mantine-color-gray-5)" />
            </marker>
          </defs>

          {flowNodes.map((node, i) => {
            const x = cx - NODE_W / 2;
            const y = PAD_X + i * (NODE_H + GAP_Y);
            const isLast = i === flowNodes.length - 1;

            return (
              <g key={node.id}>
                {/* Node rect */}
                <rect
                  x={x}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  ry={8}
                  fill="none"
                  stroke="var(--mantine-color-default-border)"
                  strokeWidth={0.5}
                />

                {/* Title */}
                <text
                  x={cx}
                  y={y + NODE_H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={13}
                  fill="var(--mantine-color-text)"
                  fontFamily="inherit"
                >
                  {node.title.length > 28 ? node.title.slice(0, 28) + '…' : node.title}
                </text>

                {/* Arrow to next */}
                {!isLast && (
                  <line
                    x1={cx}
                    y1={y + NODE_H}
                    x2={cx}
                    y2={y + NODE_H + GAP_Y}
                    stroke="var(--mantine-color-gray-5)"
                    strokeWidth={1}
                    markerEnd="url(#fc-arrow)"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </Box>
    </Stack>
  );
}
