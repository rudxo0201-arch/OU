'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Box, Stack, Text } from '@mantine/core';
import type { ViewProps } from './registry';

interface MindmapNode {
  id: string;
  title: string;
  children: string[];
}

export function MindmapView({ nodes }: ViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const mindmapNodes: MindmapNode[] = useMemo(
    () =>
      nodes.slice(0, 12).map(n => ({
        id: n.id,
        title: n.domain_data?.title ?? ((n.raw ?? '').slice(0, 20) || '아이디어'),
        children: (n.domain_data?.related ?? []).slice(0, 4),
      })),
    [nodes],
  );

  useEffect(() => {
    if (!svgRef.current || mindmapNodes.length === 0) return;

    const svg = svgRef.current;
    const W = svg.clientWidth || 500;
    const H = svg.clientHeight || 360;
    const cx = W / 2;
    const cy = H / 2;

    svg.innerHTML = '';

    // Central label
    const centerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centerText.setAttribute('x', String(cx));
    centerText.setAttribute('y', String(cy + 4));
    centerText.setAttribute('text-anchor', 'middle');
    centerText.setAttribute('font-size', '12');
    centerText.setAttribute('font-weight', '600');
    centerText.setAttribute('fill', 'currentColor');
    centerText.textContent = '중심';
    svg.appendChild(centerText);

    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', String(cx));
    centerCircle.setAttribute('cy', String(cy));
    centerCircle.setAttribute('r', '28');
    centerCircle.setAttribute('fill', 'none');
    centerCircle.setAttribute('stroke', 'var(--mantine-color-text)');
    centerCircle.setAttribute('stroke-width', '1.5');
    svg.appendChild(centerCircle);

    const primaryRadius = Math.min(W, H) * 0.3;
    const count = mindmapNodes.length;

    mindmapNodes.forEach((node, i) => {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      const nx = cx + primaryRadius * Math.cos(angle);
      const ny = cy + primaryRadius * Math.sin(angle);

      // Branch line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(cx));
      line.setAttribute('y1', String(cy));
      line.setAttribute('x2', String(nx));
      line.setAttribute('y2', String(ny));
      line.setAttribute('stroke', 'var(--mantine-color-default-border)');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);

      // Node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(nx));
      circle.setAttribute('cy', String(ny));
      circle.setAttribute('r', '22');
      circle.setAttribute('fill', 'var(--mantine-color-body)');
      circle.setAttribute('stroke', 'var(--mantine-color-text)');
      circle.setAttribute('stroke-width', '1');
      svg.appendChild(circle);

      // Node label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(nx));
      label.setAttribute('y', String(ny + 4));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '9');
      label.setAttribute('fill', 'currentColor');
      label.textContent = node.title.length > 8 ? node.title.slice(0, 8) + '…' : node.title;
      svg.appendChild(label);

      // Sub-branches
      const subRadius = 50;
      const subCount = Math.min(node.children.length, 3);
      const spreadAngle = Math.PI * 0.4;

      for (let j = 0; j < subCount; j++) {
        const subAngle = angle - spreadAngle / 2 + (spreadAngle / Math.max(subCount - 1, 1)) * j;
        const sx = nx + subRadius * Math.cos(subAngle);
        const sy = ny + subRadius * Math.sin(subAngle);

        const subLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        subLine.setAttribute('x1', String(nx));
        subLine.setAttribute('y1', String(ny));
        subLine.setAttribute('x2', String(sx));
        subLine.setAttribute('y2', String(sy));
        subLine.setAttribute('stroke', 'var(--mantine-color-default-border)');
        subLine.setAttribute('stroke-width', '0.5');
        svg.appendChild(subLine);

        const subCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        subCircle.setAttribute('cx', String(sx));
        subCircle.setAttribute('cy', String(sy));
        subCircle.setAttribute('r', '4');
        subCircle.setAttribute('fill', 'var(--mantine-color-text)');
        subCircle.setAttribute('opacity', '0.4');
        svg.appendChild(subCircle);
      }
    });
  }, [mindmapNodes]);

  if (mindmapNodes.length === 0) return null;

  return (
    <Stack gap="xs" p="sm">
      <Text fz="xs" c="dimmed">마인드맵</Text>
      <Box style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
        <svg ref={svgRef} width="100%" height={360} style={{ display: 'block' }} />
      </Box>
    </Stack>
  );
}
