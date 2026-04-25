'use client';

import { useMemo } from 'react';
import { KnowledgeGraph, type GraphNode, type GraphEdge } from './KnowledgeGraph';

interface DataNode {
  id: string;
  domain: string;
  raw?: string;
  importance?: number;
  x?: number;
  y?: number;
}

interface GraphViewProps {
  nodes: DataNode[];
  links?: { source: string; target: string; weight?: number }[];
  height?: number;
  onNodeClick?: (node: { id: string }) => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  schedule:  '#a3a3a3',
  task:      '#737373',
  knowledge: '#525252',
  idea:      '#a3a3a3',
  finance:   '#737373',
  emotion:   '#525252',
  relation:  '#a3a3a3',
  habit:     '#737373',
};

export function GraphView({ nodes, links = [], height, onNodeClick }: GraphViewProps) {
  const graphNodes: GraphNode[] = useMemo(() =>
    nodes.map(n => ({
      id: n.id,
      label: (n.raw ?? '').slice(0, 20) || n.domain,
      category: n.domain,
      importance: n.importance ?? 1,
      color: DOMAIN_COLORS[n.domain] ?? '#737373',
      x: n.x,
      y: n.y,
    })),
    [nodes]
  );

  const graphEdges: GraphEdge[] = useMemo(() =>
    links.map(l => ({
      source: l.source,
      target: l.target,
      weight: l.weight,
    })),
    [links]
  );

  const handleNodeClick = (gn: GraphNode) => {
    const original = nodes.find(n => n.id === gn.id);
    if (original) onNodeClick?.(original);
  };

  return (
    <div style={{ height: height ?? '100%', position: 'relative' }}>
      <KnowledgeGraph
        nodes={graphNodes}
        edges={graphEdges}
        onNodeClick={onNodeClick ? handleNodeClick : undefined}
      />
    </div>
  );
}
