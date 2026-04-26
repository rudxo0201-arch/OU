'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TreePine } from 'lucide-react';
import { GraphView } from '@/components/graph/GraphView';
import { NodeDetailCard } from '@/components/graph/NodeDetailCard';
import { ForceControlsPanel } from '@/components/graph/ForceControlsPanel';
import { usePresetStore } from '@/stores/presetStore';
import type { ForceParams } from '@/types';

interface RawNode {
  id: string;
  domain?: string;
  label?: string;
  raw?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export function GraphPresetView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetId = searchParams.get('preset');

  const { presets, forceParams } = usePresetStore();
  const preset = presets.find((p) => p.id === presetId) ?? presets[0];

  const [nodes, setNodes] = useState<RawNode[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<RawNode | null>(null);
  const [currentForceParams, setCurrentForceParams] = useState<ForceParams>(forceParams);
  const [showForcePanel, setShowForcePanel] = useState(false);

  // 노드 fetch
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '500' });
    if (preset?.filter?.domains?.length) {
      params.set('domain', preset.filter.domains[0]);
    }
    if (preset?.filter?.dateRange) {
      params.set('date_from', preset.filter.dateRange.from);
      params.set('date_to', preset.filter.dateRange.to);
    }
    Promise.all([
      fetch(`/api/nodes?${params}`).then((r) => r.json()),
      fetch('/api/graph').then((r) => r.json()),
    ])
      .then(([nodesRes, graphRes]) => {
        setNodes(nodesRes.data ?? nodesRes.nodes ?? []);
        setEdges(graphRes.edges ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [presetId]);

  const handleNodeClick = useCallback((node: { id: string }) => {
    const raw = nodes.find((n) => n.id === node.id) ?? { id: node.id };
    setSelectedNode((prev) => (prev?.id === raw.id ? null : raw));
  }, [nodes]);

  const graphNodes = nodes.map((n) => ({
    id: n.id,
    domain: (n.domain as string) ?? 'unknown',
    raw: n.raw as string | undefined,
    importance: undefined,
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
      {/* 그래프 캔버스 */}
      {loading ? (
        <div style={{
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)', fontSize: 13,
        }}>
          그래프 로딩 중...
        </div>
      ) : (
        <GraphView
          nodes={graphNodes}
          links={edges}
          onNodeClick={handleNodeClick}
          transparent
        />
      )}

      {/* 우측 상단 컨트롤 */}
      <div style={{
        position: 'fixed',
        top: 68, right: 72,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        zIndex: 200,
      }}>
        {/* 트리 변환 버튼 */}
        {preset && (
          <button
            title="트리뷰로 전환"
            onClick={() => router.push(`/home?view=tree-preview&preset=${preset.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <TreePine size={13} strokeWidth={1.5} />
            트리뷰
          </button>
        )}

        {/* Force 슬라이더 토글 */}
        <button
          title="Force 파라미터"
          onClick={() => setShowForcePanel((v) => !v)}
          style={{
            padding: '6px 12px',
            background: showForcePanel ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Force
        </button>
        {showForcePanel && (
          <ForceControlsPanel onParamChange={setCurrentForceParams} />
        )}
      </div>

      {/* 노드 클릭 상세 카드 */}
      {selectedNode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 201, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <NodeDetailCard
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onOpenPage={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
