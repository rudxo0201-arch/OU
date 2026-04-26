'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TreeNode } from '@/types';

export interface OuFolderTreeProps {
  data: TreeNode;
  onNodeClick?: (node: TreeNode) => void;
  selectedId?: string;
  /** OrbIcon 아이콘 좌표 — 트리 펼침 애니메이션 시작점 */
  originPoint?: { x: number; y: number };
  width?: number;
  height?: number;
}

interface D3Node extends d3.HierarchyPointNode<TreeNode> {}

const NODE_R = 6;
const NODE_SPACING_X = 180;
const NODE_SPACING_Y = 36;

export function OuFolderTree({
  data,
  onNodeClick,
  selectedId,
  originPoint,
  width,
  height,
}: OuFolderTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const W = width ?? (svg.clientWidth || 800);
    const H = height ?? (svg.clientHeight || 600);

    // d3 hierarchy
    const root = d3.hierarchy(data);
    const treeLayout = d3.cluster<TreeNode>().nodeSize([NODE_SPACING_Y, NODE_SPACING_X]);
    treeLayout(root);

    // 노드 좌표 (cluster는 y=depth, x=spread)
    const nodes = root.descendants() as D3Node[];
    const links = root.links();

    // 전체 bounds → center
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const treeW = maxY - minY + NODE_SPACING_X;
    const treeH = maxX - minX + NODE_SPACING_Y;
    const tx = W / 2 - (minY + treeW / 2);
    const ty = H / 2 - (minX + treeH / 2);

    // SVG 초기화
    d3.select(svg).selectAll('*').remove();
    const g = d3.select(svg)
      .attr('width', W)
      .attr('height', H)
      .append('g')
      .attr('transform', `translate(${tx},${ty})`);

    // origin for animation
    const ox = originPoint ? originPoint.x - tx : 0;
    const oy = originPoint ? originPoint.y - ty : 0;

    // linkHorizontal: source/target 좌표 (d3 cluster: y=depth=horizontal, x=spread=vertical)
    const linkGen = d3.linkHorizontal<
      d3.HierarchyLink<TreeNode>,
      d3.HierarchyPointNode<TreeNode>
    >()
      .x((d) => (d as D3Node).y)
      .y((d) => (d as D3Node).x);

    // Links
    const path = g.selectAll<SVGPathElement, d3.HierarchyLink<TreeNode>>('path.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.35)')
      .attr('stroke-width', 1.5)
      .attr('d', linkGen as any);

    // Animate links with stroke-dasharray
    if (originPoint) {
      path.each(function () {
        const len = (this as SVGPathElement).getTotalLength?.() ?? 100;
        d3.select(this)
          .attr('stroke-dasharray', `${len} ${len}`)
          .attr('stroke-dashoffset', len)
          .transition()
          .duration(500)
          .ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0);
      });
    }

    // Node groups
    const nodeG = g.selectAll<SVGGElement, D3Node>('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', originPoint
        ? `translate(${oy},${ox})`
        : (d) => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (_, d) => onNodeClick?.(d.data));

    if (originPoint) {
      nodeG.transition()
        .delay((_, i) => i * 30)
        .duration(400)
        .ease(d3.easeCubicOut)
        .attr('transform', (d) => `translate(${d.y},${d.x})`);
    }

    // Circle
    nodeG.append('circle')
      .attr('r', NODE_R)
      .attr('fill', 'transparent')
      .attr('stroke', (d) =>
        d.data.id === selectedId
          ? 'rgba(255,255,255,1)'
          : 'rgba(255,255,255,0.8)')
      .attr('stroke-width', (d) => d.data.id === selectedId ? 2 : 1.5)
      .style('filter', (d) =>
        d.data.id === selectedId
          ? 'drop-shadow(0 0 8px rgba(255,255,255,0.7))'
          : 'none');

    // Label
    nodeG.append('text')
      .attr('x', (d) => d.children ? -10 : 10)
      .attr('dy', '0.31em')
      .attr('text-anchor', (d) => d.children ? 'end' : 'start')
      .attr('fill', 'rgba(255,255,255,0.85)')
      .attr('font-size', 11)
      .attr('font-family', 'var(--ou-font-body)')
      .text((d) => d.data.label.length > 20 ? d.data.label.slice(0, 19) + '…' : d.data.label);

    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedId, width, height]);

  return (
    <svg
      ref={svgRef}
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        opacity: ready || !originPoint ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    />
  );
}
