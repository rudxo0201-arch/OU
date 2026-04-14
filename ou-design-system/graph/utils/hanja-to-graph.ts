import { Hanja } from '@/types/hanja';
import type { GraphNode, GraphEdge } from '@/components/graph/KnowledgeGraph';

/**
 * Convert hanja data to graph nodes and edges.
 * Nodes = individual characters.
 * Edges = compound word connections (characters that appear together in compounds).
 */
export function hanjaToGraph(items: Hanja[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = items.map((h) => ({
    id: h.id,
    label: h.char,
    category: h.domain?.[0] ?? '일반',
    pronunciation: h.pronunciation,
    meaning: h.meaning,
    importance: h.importance,
  }));

  const nodeIds = new Set(items.map((h) => h.id));
  const edgeMap = new Map<string, GraphEdge>();

  for (const h of items) {
    for (const compound of h.compounds) {
      const chars = compound.chars ?? [];
      // Connect all chars in the compound to each other
      for (let i = 0; i < chars.length; i++) {
        for (let j = i + 1; j < chars.length; j++) {
          if (!nodeIds.has(chars[i]) || !nodeIds.has(chars[j])) continue;
          const key = [chars[i], chars[j]].sort().join('-');
          if (!edgeMap.has(key)) {
            edgeMap.set(key, {
              source: chars[i],
              target: chars[j],
              type: 'compound',
              weight: 1,
            });
          } else {
            edgeMap.get(key)!.weight! += 0.5;
          }
        }
      }
    }
  }

  return { nodes, edges: Array.from(edgeMap.values()) };
}
