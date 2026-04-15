'use client';

import { useState, useCallback, useRef } from 'react';
import { Box } from '@mantine/core';
import dynamic from 'next/dynamic';
import type { GraphViewHandle } from '@/components/graph/GraphView';
import { useAuth } from '@/hooks/useAuth';
import { useViewEditorStore } from '@/stores/viewEditorStore';

const GraphView = dynamic(
  () => import('@/components/graph/GraphView').then(m => m.GraphView),
  { ssr: false }
);
const AdminViewsPanel = dynamic(
  () => import('@/components/my/AdminViewsPanel').then(m => m.AdminViewsPanel),
  { ssr: false }
);
const ViewEditorDrawer = dynamic(
  () => import('@/components/views/admin/ViewEditorDrawer').then(m => m.ViewEditorDrawer),
  { ssr: false }
);
import { FloatingToolbar } from '@/components/my/FloatingToolbar';
import { NodeDetailPanel } from '@/components/my/NodeDetailPanel';
import { NodePreviewCard } from '@/components/my/NodePreviewCard';
import { SavedViewCarousel } from '@/components/my/SavedViewCarousel';
import { GenesisEmptyState } from '@/components/my/GenesisEmptyState';

interface MyPageClientProps {
  savedViews: any[];
  nodes: any[];
  links?: Array<{ source: string; target: string; label?: string }>;
}

export function MyPageClient({ savedViews: initialSavedViews, nodes: initialNodes, links: initialLinks = [] }: MyPageClientProps) {
  const [nodes, setNodes] = useState(initialNodes);
  const [savedViews, setSavedViews] = useState(initialSavedViews);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [detailMode, setDetailMode] = useState<'preview' | 'detail'>('preview');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const graphRef = useRef<GraphViewHandle>(null);
  const { isAdmin } = useAuth();
  const editorIsOpen = useViewEditorStore(s => s.isOpen);

  const handleNodeUpdated = useCallback((updatedNode: any) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? { ...n, ...updatedNode } : n));
    setSelectedNode((prev: any) => prev?.id === updatedNode.id ? { ...prev, ...updatedNode } : prev);
  }, []);

  const handleNodeDeleted = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setSelectedNode(null);
  }, []);

  const handleNodeSelect = useCallback((node: any) => {
    setSelectedNode(node);
    setDetailMode('preview');
  }, []);

  const handleRelatedNodeClick = useCallback((nodeId: string) => {
    const relNode = nodes.find(n => n.id === nodeId);
    if (relNode) {
      setSelectedNode(relNode);
      setDetailMode('preview');
      graphRef.current?.focusNode(nodeId);
    }
  }, [nodes]);

  const handleViewsRefresh = useCallback(async () => {
    try {
      const res = await fetch('/api/views');
      if (res.ok) {
        const { views } = await res.json();
        setSavedViews(views ?? []);
      }
    } catch {
      // Silent fail
    }
  }, []);

  // Filter nodes for graph highlighting based on search
  const filteredNodeIds = searchQuery.trim()
    ? new Set(
        nodes
          .filter(n => {
            const q = searchQuery.toLowerCase();
            const rawMatch = n.raw?.toLowerCase().includes(q);
            const domainDataMatch = n.domain_data
              ? JSON.stringify(n.domain_data).toLowerCase().includes(q)
              : false;
            return rawMatch || domainDataMatch;
          })
          .map(n => n.id)
      )
    : null;

  return (
    <Box style={{ position: 'relative', width: '100%', height: 'calc(100vh - 0px)', overflow: 'hidden' }}>
      {/* 풀스크린 배경 */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: '#060810',
        }}
      />

      {/* 그래프 — 있든 없든 배경으로 */}
      {nodes.length > 0 ? (
        <GraphView
          ref={graphRef}
          nodes={nodes}
          links={initialLinks}
          fullscreen
          onNodeSelect={handleNodeSelect}
          highlightNodeIds={filteredNodeIds}
        />
      ) : (
        <GenesisEmptyState />
      )}

      {/* 상단 글래스 툴바 */}
      {nodes.length > 0 && !adminMode && (
        <FloatingToolbar
          savedViews={savedViews}
          onSearchChange={setSearchQuery}
          isAdmin={isAdmin}
          onAdminModeToggle={() => setAdminMode(true)}
        />
      )}

      {/* 관리자 뷰 관리 패널 */}
      {adminMode && isAdmin && (
        <AdminViewsPanel
          views={savedViews}
          onClose={() => setAdminMode(false)}
          onViewsChange={setSavedViews}
        />
      )}

      {/* 뷰 에디터 Drawer */}
      {isAdmin && editorIsOpen && (
        <ViewEditorDrawer nodes={nodes} onSaved={handleViewsRefresh} />
      )}

      {/* 노드 미리보기 카드 */}
      {selectedNode && !adminMode && detailMode === 'preview' && (
        <NodePreviewCard
          node={selectedNode}
          onOpen={() => setDetailMode('detail')}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* 노드 상세 패널 */}
      {selectedNode && !adminMode && detailMode === 'detail' && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onNodeUpdated={handleNodeUpdated}
          onNodeDeleted={handleNodeDeleted}
          onRelatedNodeClick={handleRelatedNodeClick}
        />
      )}

      {/* 하단 저장된 뷰 캐러셀 */}
      {(!selectedNode || detailMode === 'preview') && !adminMode && (
        <SavedViewCarousel views={savedViews} nodes={nodes} />
      )}
    </Box>
  );
}
