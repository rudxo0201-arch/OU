'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, Text, Stack, Paper, Group, Badge } from '@mantine/core';
import type { ViewProps } from './registry';
import { tripleToSentence } from '@/lib/triples/sentence-templates';
import type { TriplePredicate } from '@/types';

interface GNode { id: string; label: string; importance: number; x: number; y: number; vx: number; vy: number; conns: number; }
interface GEdge { source: string; target: string; predicate: string; sourceLabel?: string; targetLabel?: string; }

function truncate(s: string, max: number) { return s.length > max ? s.slice(0, max) + '...' : s; }

function buildGraph(nodes: any[]): { gNodes: GNode[]; gEdges: GEdge[] } {
  const gNodes: GNode[] = [];
  const gEdges: GEdge[] = [];
  const idSet = new Set<string>();
  const connCount: Record<string, number> = {};

  const display = nodes.slice(0, 40);
  display.forEach(n => { idSet.add(n.id); connCount[n.id] = 0; });

  // Build edges from triples
  display.forEach(n => {
    const triples = n.triples ?? n.domain_data?.triples ?? [];
    triples.forEach((t: any) => {
      const subj = t.subject_node_id ?? t.subject;
      const obj = t.object_node_id ?? t.object;
      if (subj && obj && idSet.has(subj) && idSet.has(obj) && subj !== obj) {
        gEdges.push({
          source: subj, target: obj, predicate: t.predicate ?? 'related_to',
          sourceLabel: t.subject ?? '', targetLabel: t.object ?? '',
        });
        connCount[subj] = (connCount[subj] ?? 0) + 1;
        connCount[obj] = (connCount[obj] ?? 0) + 1;
      }
    });
  });

  display.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / display.length;
    gNodes.push({
      id: n.id,
      label: n.domain_data?.title ?? ((n.raw ?? '').slice(0, 30) || `Node ${i + 1}`),
      importance: n.domain_data?.importance ?? 3,
      x: 300 + 200 * Math.cos(angle) + (Math.random() - 0.5) * 40,
      y: 250 + 180 * Math.sin(angle) + (Math.random() - 0.5) * 40,
      vx: 0, vy: 0,
      conns: connCount[n.id] ?? 0,
    });
  });

  return { gNodes, gEdges };
}

function simulate(nodes: GNode[], edges: GEdge[], iterations = 50) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (800 * alpha) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx; nodes[i].vy -= fy;
        nodes[j].vx += fx; nodes[j].vy += fy;
      }
    }
    // Attraction along edges
    edges.forEach(e => {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) return;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - 100) * 0.05 * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx; s.vy += fy;
      t.vx -= fx; t.vy -= fy;
    });
    // Center gravity
    nodes.forEach(n => {
      n.vx += (300 - n.x) * 0.01 * alpha;
      n.vy += (250 - n.y) * 0.01 * alpha;
      n.x += n.vx * 0.6;
      n.y += n.vy * 0.6;
      n.vx *= 0.5;
      n.vy *= 0.5;
    });
  }
}

export function KnowledgeGraphView({ nodes }: ViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 600, h: 500 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  const { gNodes, gEdges } = useMemo(() => {
    const g = buildGraph(nodes);
    simulate(g.gNodes, g.gEdges, 50);
    return g;
  }, [nodes]);

  const nodeMap = useMemo(() => new Map(gNodes.map(n => [n.id, n])), [gNodes]);

  const connectedTo = useMemo(() => {
    const m = new Map<string, Set<string>>();
    gEdges.forEach(e => {
      if (!m.has(e.source)) m.set(e.source, new Set());
      if (!m.has(e.target)) m.set(e.target, new Set());
      m.get(e.source)!.add(e.target);
      m.get(e.target)!.add(e.source);
    });
    return m;
  }, [gEdges]);

  const isHighlighted = useCallback((id: string) => {
    if (!hoverId) return true;
    return id === hoverId || (connectedTo.get(hoverId)?.has(id) ?? false);
  }, [hoverId, connectedTo]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(vb => {
      const cx = vb.x + vb.w / 2;
      const cy = vb.y + vb.h / 2;
      const nw = vb.w * factor;
      const nh = vb.h * factor;
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).tagName === 'rect') {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
    }
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current || !svgRef.current) return;
    const svg = svgRef.current;
    const scale = viewBox.w / (svg.clientWidth || 600);
    const dx = (e.clientX - panStart.current.x) * scale;
    const dy = (e.clientY - panStart.current.y) * scale;
    setViewBox(vb => ({ ...vb, x: panStart.current.vx - dx, y: panStart.current.vy - dy }));
  }, [viewBox.w]);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const selectedNode = selectedId ? nodeMap.get(selectedId) : null;
  const selectedRaw = selectedId ? nodes.find(n => n.id === selectedId) : null;

  const maxConns = Math.max(1, ...gNodes.map(n => n.conns));

  if (nodes.length === 0) return null;

  return (
    <Stack gap="xs" p="sm">
      <Text fz="xs" c="dimmed">지식 그래프 ({gNodes.length}개, {gEdges.length}개 연결)</Text>
      <Box style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8, overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={400}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          style={{ display: 'block', cursor: isPanning.current ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="transparent" />

          {/* Edges */}
          {gEdges.map((e, i) => {
            const s = nodeMap.get(e.source);
            const t = nodeMap.get(e.target);
            if (!s || !t) return null;
            const hl = isHighlighted(e.source) && isHighlighted(e.target);
            return (
              <line
                key={i}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke="var(--mantine-color-default-border)"
                strokeWidth={hl ? 1 : 0.5}
                opacity={hl ? 0.6 : 0.15}
                style={{ transition: 'opacity 200ms' }}
              />
            );
          })}

          {/* Nodes */}
          {gNodes.map(n => {
            const hl = isHighlighted(n.id);
            const isHover = hoverId === n.id;
            const isSelected = selectedId === n.id;
            const baseR = 5 + (n.conns / maxConns) * 10;
            const fillOpacity = 0.3 + (n.importance / 5) * 0.6;
            return (
              <g
                key={n.id}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={e => { e.stopPropagation(); setSelectedId(n.id === selectedId ? null : n.id); }}
                style={{ cursor: 'pointer', transition: 'opacity 200ms' }}
                opacity={hl ? 1 : 0.15}
              >
                <circle
                  cx={n.x} cy={n.y} r={baseR}
                  fill="var(--mantine-color-text)"
                  opacity={fillOpacity}
                  stroke={isSelected ? 'var(--mantine-color-text)' : 'none'}
                  strokeWidth={isSelected ? 1.5 : 0}
                />
                <text
                  x={n.x} y={n.y - baseR - 4}
                  textAnchor="middle"
                  fontSize={isHover ? 11 : 9}
                  fill="currentColor"
                  opacity={isHover ? 1 : 0.7}
                  fontWeight={isHover ? 600 : 400}
                  style={{ transition: 'font-size 150ms, opacity 150ms' }}
                >
                  {isHover ? truncate(n.label, 30) : truncate(n.label, 12)}
                </text>
                {isHover && (
                  <text x={n.x} y={n.y + baseR + 12} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.5}>
                    연결 {n.conns}개
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </Box>

      {/* Selected node info panel */}
      {selectedNode && selectedRaw && (
        <Paper p="sm" style={{ border: '0.5px solid var(--mantine-color-default-border)' }}>
          <Group gap="xs" mb={4}>
            <Text fz="sm" fw={600}>{selectedNode.label}</Text>
            <Badge size="xs" variant="light" color="gray">연결 {selectedNode.conns}개</Badge>
          </Group>
          {selectedRaw.domain_data?.description && (
            <Text fz="xs" c="dimmed" lineClamp={3}>{selectedRaw.domain_data.description}</Text>
          )}
          {selectedRaw.raw && !selectedRaw.domain_data?.description && (
            <Text fz="xs" c="dimmed" lineClamp={3}>{selectedRaw.raw.slice(0, 200)}</Text>
          )}
          {gEdges.filter(e => e.source === selectedId || e.target === selectedId).length > 0 && (
            <Stack gap={2} mt={8}>
              <Text fz={11} fw={500}>연결:</Text>
              {gEdges.filter(e => e.source === selectedId || e.target === selectedId).slice(0, 5).map((e, i) => {
                const otherId = e.source === selectedId ? e.target : e.source;
                const other = nodeMap.get(otherId);
                const sentence = tripleToSentence({
                  subject: e.source === selectedId ? selectedNode.label : (other?.label ?? '?'),
                  predicate: e.predicate as TriplePredicate,
                  object: e.source === selectedId ? (other?.label ?? '?') : selectedNode.label,
                });
                return (
                  <Text key={i} fz={11} c="dimmed">
                    {sentence}
                  </Text>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}
    </Stack>
  );
}
