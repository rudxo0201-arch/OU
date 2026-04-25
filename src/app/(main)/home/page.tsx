'use client';

import { useEffect, useState, useCallback } from 'react';
import { WidgetGrid } from '@/components/widgets/WidgetGrid';
import { ViewPickerPanel } from '@/components/widgets/ViewPickerPanel';
import { GraphView } from '@/components/graph/GraphView';
import { NodeDetailCard } from '@/components/graph/NodeDetailCard';
import { FolderPanel } from '@/components/layout/FolderPanel';
import { PageRenderer, type FullNode } from '@/components/page/PageRenderer';
import { useHomeViewStore } from '@/stores/homeViewStore';
import '@/components/widgets/views/register';

const NAV_HEIGHT = 56;

interface RawNode {
  id: string;
  domain?: string;
  label?: string;
  raw?: string;
  createdAt?: string;
  domainType?: string | null;
  isAdmin?: boolean;
  [key: string]: unknown;
}

export default function HomePage() {
  const { activeView, setView } = useHomeViewStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [folderPanelOpen, setFolderPanelOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<RawNode | null>(null);
  const [openedPage, setOpenedPage] = useState<FullNode | null>(null);

  // 그래프 원본 데이터
  const [rawNodes, setRawNodes] = useState<RawNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<any[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);

  // 그래프 뷰 진입 시 fetch
  useEffect(() => {
    if (activeView !== 'graph' || rawNodes.length > 0) return;
    setGraphLoading(true);
    fetch('/api/graph')
      .then(r => r.json())
      .then(d => { setRawNodes(d.nodes ?? []); setGraphEdges(d.edges ?? []); })
      .catch(() => {})
      .finally(() => setGraphLoading(false));
  }, [activeView]);

  // 뷰 전환 시 상태 초기화
  useEffect(() => {
    if (activeView !== 'graph') setSelectedNode(null);
  }, [activeView]);

  // 폴더 패널 이벤트
  useEffect(() => {
    const handler = () => setFolderPanelOpen(v => !v);
    window.addEventListener('left-folder-open', handler);
    return () => window.removeEventListener('left-folder-open', handler);
  }, []);

  // 위젯 편집 모드 + 키보드
  useEffect(() => {
    const onModeChange = (e: Event) => {
      const active = (e as CustomEvent).detail?.active ?? false;
      setEditMode(active);
      if (!active) setPickerOpen(false);
    };
    const onAddWidget = () => setPickerOpen(p => !p);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('widget-edit-mode-enter'));
      }
      if (e.key === 'Escape') {
        if (openedPage) { setOpenedPage(null); return; }
        setSelectedNode(null);
        setFolderPanelOpen(false);
      }
    };
    window.addEventListener('widget-edit-mode-change', onModeChange);
    window.addEventListener('dock-add-widget', onAddWidget);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('widget-edit-mode-change', onModeChange);
      window.removeEventListener('dock-add-widget', onAddWidget);
      window.removeEventListener('keydown', onKey);
    };
  }, [openedPage]);

  // 그래프 노드 클릭 → NodeDetailCard
  const handleNodeClick = useCallback((node: { id: string }) => {
    const raw = rawNodes.find(n => n.id === node.id) ?? { id: node.id } as RawNode;
    setSelectedNode(prev => prev?.id === raw.id ? null : raw);
  }, [rawNodes]);

  // NodeDetailCard "자세히 보기" → PageRenderer
  const handleOpenPage = useCallback((node: RawNode) => {
    const fullNode: FullNode = {
      id: node.id,
      domain: (node.domain as string) ?? 'unknown',
      raw: (node.raw as string) ?? '',
      domain_data: null,
      created_at: (node.createdAt as string) ?? '',
    };
    setOpenedPage(fullNode);
    setView('page');
    setSelectedNode(null);
  }, [setView]);

  const graphViewNodes = rawNodes.map(n => ({
    id: n.id,
    domain: (n.domain as string) ?? 'unknown',
    raw: n.raw as string | undefined,
    importance: undefined,
    x: undefined,
    y: undefined,
  }));

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>

        {/* ── 메인 콘텐츠 (그래프 외) ── */}
        <div style={{ position: 'absolute', top: NAV_HEIGHT, bottom: 0, left: 0, right: 0 }}>
          {activeView === 'page' && openedPage ? (
            <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
              <PageRenderer
                node={openedPage}
                onClose={() => { setOpenedPage(null); setView('graph'); }}
              />
            </div>
          ) : activeView === 'graph' ? null : (
            <WidgetGrid />
          )}
        </div>

        {/* ── 그래프 — position:fixed inset:0 z:1 → 우주 전체 채움, nav(z200)·아이콘바(z100) 아래 ── */}
        {activeView === 'graph' && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
            {graphLoading ? (
              <div style={{
                height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.3)', fontSize: 13,
              }}>
                그래프 로딩 중...
              </div>
            ) : (
              <GraphView
                nodes={graphViewNodes}
                links={graphEdges}
                onNodeClick={handleNodeClick}
                transparent
              />
            )}
          </div>
        )}

        {/* ── 노드 클릭 카드 — nav(z200) 위에 ── */}
        {activeView === 'graph' && selectedNode && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 201, pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}>
              <NodeDetailCard
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                onOpenPage={() => handleOpenPage(selectedNode)}
              />
            </div>
          </div>
        )}

        {/* ── 폴더 패널 ── */}
        <FolderPanel open={folderPanelOpen} onClose={() => setFolderPanelOpen(false)} />

        {/* ── 편집 모드 딤 오버레이 ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 5, pointerEvents: 'none',
          opacity: editMode ? 1 : 0,
          transition: 'opacity 200ms ease',
        }} />

        <ViewPickerPanel open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
}
