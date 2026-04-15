'use client';

import { useEffect, useRef } from 'react';
import { Box, Text, Stack } from '@mantine/core';
import type { ViewProps } from './registry';

// Phase 1: SVG 기반 간단한 노드 시각화
// Phase 2: PixiJS WebGL로 업그레이드
export function KnowledgeGraphView({ nodes }: ViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = svgRef.current;
    const W = svg.clientWidth || 400;
    const H = svg.clientHeight || 300;

    const angleStep = (2 * Math.PI) / nodes.length;
    const radius = Math.min(W, H) * 0.35;
    const cx = W / 2;
    const cy = H / 2;

    svg.innerHTML = '';

    nodes.slice(0, 20).forEach((node, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(cx));
      line.setAttribute('y1', String(cy));
      line.setAttribute('x2', String(x));
      line.setAttribute('y2', String(y));
      line.setAttribute('stroke', 'var(--mantine-color-default-border)');
      line.setAttribute('stroke-width', '0.5');
      svg.appendChild(line);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(x));
      circle.setAttribute('cy', String(y));
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', 'var(--mantine-color-text)');
      circle.setAttribute('opacity', '0.6');
      svg.appendChild(circle);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(x));
      text.setAttribute('y', String(y - 10));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', 'currentColor');
      text.setAttribute('opacity', '0.7');
      text.textContent = (node.raw ?? '').slice(0, 10);
      svg.appendChild(text);
    });

    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', String(cx));
    centerCircle.setAttribute('cy', String(cy));
    centerCircle.setAttribute('r', '10');
    centerCircle.setAttribute('fill', 'var(--mantine-color-text)');
    svg.appendChild(centerCircle);
  }, [nodes]);

  if (nodes.length === 0) return null;

  return (
    <Stack gap="xs" p="sm">
      <Text fz="xs" c="dimmed">지식 그래프</Text>
      <Box style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
        <svg ref={svgRef} width="100%" height={300} style={{ display: 'block' }} />
      </Box>
    </Stack>
  );
}
