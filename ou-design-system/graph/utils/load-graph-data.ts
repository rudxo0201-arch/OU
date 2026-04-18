import graphRaw from '@/data/graph.json';
import type { GraphNode, GraphEdge } from '@/components/graph/KnowledgeGraph';

interface RawGraph {
  n: { id: string; l: string; p: string; m: string; i: number; x: number; y: number }[];
  e: [string, string][];
}

let cached: { nodes: GraphNode[]; edges: GraphEdge[] } | null = null;

export function getPrebuiltGraph() {
  if (cached) return cached;

  const raw = graphRaw as RawGraph;

  const nodes: GraphNode[] = raw.n.map((n) => ({
    id: n.id,
    label: n.l,
    pronunciation: n.p,
    meaning: n.m || '',
    importance: n.i || null,
    category: 'hanja',
    x: n.x,
    y: n.y,
    // No fx/fy — physics engine maintains equilibrium naturally
  }));

  const edges: GraphEdge[] = raw.e.map(([s, t]) => ({
    source: s,
    target: t,
    type: 'compound',
  }));

  cached = { nodes, edges };
  return cached;
}
