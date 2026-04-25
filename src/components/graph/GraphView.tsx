'use client';

import { useMemo, useEffect, useState } from 'react';
import { KnowledgeGraph, type GraphNode, type GraphEdge } from './KnowledgeGraph';

export interface Item {
  id: string;
  domain: string;
  raw?: string;
  importance?: number;
  x?: number;
  y?: number;
}

type Link = { source: string; target: string; weight?: number };

// nodes는 any[]로 받음 — registry(ViewProps) 호환을 위해. 내부에서 Item 형태로 사용한다.
interface GraphViewProps {
  nodes: any[];
  /** 명시적으로 넘기면 그대로 사용. 없으면 /api/graph에서 fetch */
  links?: Link[];
  height?: number;
  onNodeClick?: (node: { id: string }) => void;
  /** 강조할 노드 id — KnowledgeGraph로 통과 */
  activeNodeId?: string;
  /** activeNodeId의 1-hop 이웃만 표시 */
  localMode?: boolean;
  /** ViewProps 호환 — graph 뷰에서 의미는 없지만 시그니처 맞춤용 */
  filters?: Record<string, unknown>;
  onSave?: () => void;
  layoutConfig?: unknown;
  inline?: boolean;
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

export function GraphView({ nodes, links, height, onNodeClick, activeNodeId, localMode }: GraphViewProps) {
  const linksProvided = links !== undefined;
  const [fetchedLinks, setFetchedLinks] = useState<Link[] | null>(null);

  useEffect(() => {
    if (linksProvided) return;
    let cancelled = false;
    fetch('/api/graph')
      .then(r => (r.ok ? r.json() : { edges: [] }))
      .then(json => {
        if (cancelled) return;
        const edges: Link[] = (json.edges ?? []).map((e: { source: string; target: string; weight?: number }) => ({
          source: e.source, target: e.target, weight: e.weight,
        }));
        setFetchedLinks(edges);
      })
      .catch(() => { if (!cancelled) setFetchedLinks([]); });
    return () => { cancelled = true; };
  }, [linksProvided]);

  const effectiveLinks: Link[] = links ?? fetchedLinks ?? [];

  const graphNodes: GraphNode[] = useMemo(() =>
    (nodes as Item[]).map(n => ({
      id: n.id,
      label: (n.raw ?? '').slice(0, 20) || n.domain || '',
      category: n.domain,
      importance: n.importance ?? 1,
      color: DOMAIN_COLORS[n.domain] ?? '#737373',
      x: n.x,
      y: n.y,
    })),
    [nodes]
  );

  const graphEdges: GraphEdge[] = useMemo(() =>
    effectiveLinks.map(l => ({
      source: l.source,
      target: l.target,
      weight: l.weight,
    })),
    [effectiveLinks]
  );

  const handleNodeClick = (gn: GraphNode) => {
    const original = (nodes as Item[]).find(n => n.id === gn.id);
    if (original) onNodeClick?.(original);
  };

  return (
    <div style={{ height: height ?? '100%', position: 'relative' }}>
      <KnowledgeGraph
        nodes={graphNodes}
        edges={graphEdges}
        onNodeClick={onNodeClick ? handleNodeClick : undefined}
        activeNodeId={activeNodeId}
        localMode={localMode}
      />
    </div>
  );
}
