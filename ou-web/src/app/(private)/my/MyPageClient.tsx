'use client';

import { useState, useCallback, useRef } from 'react';
import { Box } from '@mantine/core';
import dynamic from 'next/dynamic';
import type { GraphViewHandle } from '@/components/graph/GraphView';
import { useAuth } from '@/hooks/useAuth';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import { useNavigationStore } from '@/stores/navigationStore';

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
const ChatPanel = dynamic(
  () => import('@/components/chat/ChatPanel').then(m => m.ChatPanel),
  { ssr: false }
);

import { FloatingToolbar } from '@/components/my/FloatingToolbar';
import { NodeDetailPanel } from '@/components/my/NodeDetailPanel';
import { NodePreviewCard } from '@/components/my/NodePreviewCard';
import { GenesisEmptyState } from '@/components/my/GenesisEmptyState';
import { ViewFullscreen } from '@/components/ui/ViewFullscreen';
import { OrbDock, type OrbItem } from '@/components/ui/OrbDock';

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
  const [fullscreenViewId, setFullscreenViewId] = useState<string | null>(null);
  const graphRef = useRef<GraphViewHandle>(null);
  const { isAdmin } = useAuth();
  const editorIsOpen = useViewEditorStore(s => s.isOpen);
  const { pinnedViewIds, pinView, unpinView } = useNavigationStore();

  const handleNodeUpdated = useCallback((updatedNode: any) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? { ...n, ...updatedNode } : n));
    setSelectedNode((prev: any) => prev?.id === updatedNode.id ? { ...prev, ...updatedNode } : prev);
  }, []);

  const handleNodeDeleted = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setSelectedNode(null);
  }, []);

  const handleNodeSelect = useCallback((node: any) => {
    // View nodes open their view instead of preview card
    if (node?.graph_type === 'view' && node?._viewId) {
      setFullscreenViewId(node._viewId);
      return;
    }
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

  const handleNodeCreated = useCallback((node: { id: string; domain: string; raw: string }) => {
    setNodes(prev => [...prev, { ...node, importance: 1, created_at: new Date().toISOString() }]);
    graphRef.current?.addNode({ ...node, importance: 1 });
  }, []);

  const filteredNodeIds = searchQuery.trim()
    ? new Set(
        nodes
          .filter(n => {
            const q = searchQuery.toLowerCase();
            return n.raw?.toLowerCase().includes(q) ||
              (n.domain_data ? JSON.stringify(n.domain_data).toLowerCase().includes(q) : false);
          })
          .map(n => n.id)
      )
    : null;

  const fullscreenView = fullscreenViewId
    ? savedViews.find((v: any) => v.id === fullscreenViewId)
    : null;

  // Build Orb items: pinned views + auto-generated (recent views not yet pinned)
  const pinnedOrbs: OrbItem[] = savedViews
    .filter((v: any) => pinnedViewIds.includes(v.id))
    .map((v: any) => ({
      id: v.id,
      label: v.name,
      emoji: v.icon || '📄',
      pinned: true,
      onClick: () => setFullscreenViewId(v.id),
      onPin: () => pinView(v.id),
      onUnpin: () => unpinView(v.id),
    }));

  // Auto orbs: most recent unpinned views (up to fill 7 total)
  const autoSlots = Math.max(0, 7 - pinnedOrbs.length);
  const autoOrbs: OrbItem[] = savedViews
    .filter((v: any) => !pinnedViewIds.includes(v.id))
    .slice(0, autoSlots)
    .map((v: any) => ({
      id: v.id,
      label: v.name,
      emoji: v.icon || '📄',
      pinned: false,
      onClick: () => setFullscreenViewId(v.id),
      onPin: () => pinView(v.id),
      onUnpin: () => unpinView(v.id),
    }));

  const orbItems: OrbItem[] = [...pinnedOrbs, ...autoOrbs];

  // Unified layout — graph background + glass chat left + orb dock right
  return (
    <Box style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Layer 0: Background — the universe itself */}
      <Box style={{ position: 'absolute', inset: 0, background: 'var(--ou-space)' }} />

      {/* Layer 1: Graph (full screen, no borders — the graph IS the universe) */}
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

      {/* Layer 2: Chat panel — left side, glass-block */}
      <Box style={{
        position: 'absolute',
        left: 16,
        top: 16,
        bottom: 16,
        width: 360,
        zIndex: 10,
        background: 'var(--ou-surface-subtle)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '0.5px solid var(--ou-border-subtle)',
        borderRadius: 'var(--ou-radius-card)',
        boxShadow: 'var(--ou-glow-sm)',
        overflow: 'hidden',
      }}>
        <ChatPanel onNodeCreated={handleNodeCreated} />
      </Box>

      {/* Layer 3: Orb Dock — right side, fixed */}
      {orbItems.length > 0 && (
        <OrbDock side="right" items={orbItems} />
      )}

      {/* Layer 4: Floating toolbar — pill-block buttons */}
      {nodes.length > 0 && !adminMode && (
        <FloatingToolbar
          savedViews={savedViews}
          onSearchChange={setSearchQuery}
          isAdmin={isAdmin}
          onAdminModeToggle={() => setAdminMode(true)}
        />
      )}

      {/* Layer 5: Node preview — glass-block with backdrop blur */}
      {selectedNode && !adminMode && detailMode === 'preview' && (
        <NodePreviewCard
          node={selectedNode}
          onOpen={() => setDetailMode('detail')}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Node detail panel — glass-block sidebar */}
      {selectedNode && !adminMode && detailMode === 'detail' && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onNodeUpdated={handleNodeUpdated}
          onNodeDeleted={handleNodeDeleted}
          onRelatedNodeClick={handleRelatedNodeClick}
        />
      )}

      {/* Admin controls */}
      {adminMode && isAdmin && (
        <AdminViewsPanel
          views={savedViews}
          onClose={() => setAdminMode(false)}
          onViewsChange={setSavedViews}
        />
      )}

      {isAdmin && editorIsOpen && (
        <ViewEditorDrawer nodes={nodes} onSaved={handleViewsRefresh} />
      )}

      {/* Fullscreen view overlay */}
      {fullscreenView && (
        <ViewFullscreen
          view={fullscreenView}
          nodes={nodes}
          onClose={() => setFullscreenViewId(null)}
        />
      )}
    </Box>
  );
}
