'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { WidgetGrid } from '@/components/widgets/WidgetGrid';
import { ViewPickerPanel } from '@/components/widgets/ViewPickerPanel';
import { GraphView } from '@/components/graph/GraphView';
import { NodeDetailCard } from '@/components/graph/NodeDetailCard';
import { FolderPanel } from '@/components/layout/FolderPanel';
import { PageRenderer, type FullNode } from '@/components/page/PageRenderer';
import { GraphPresetView } from '@/components/views/GraphPresetView';
import { TreePresetOverlay } from '@/components/views/TreePresetOverlay';
import { TreeFullLayer } from '@/components/views/TreeFullLayer';
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

function HomePageInner() {
  const { activeView, setView } = useHomeViewStore();
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view');

  // URL searchParams → homeViewStore sync (뒤로가기 포함)
  useEffect(() => {
    if (urlView === 'graph') setView('graph');
    else if (urlView === 'tree-full') setView('page'); // 위젯 그리드 숨김
    else setView('dashboard');
  }, [urlView, setView]);
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

        {/* ── 그래프 프리셋 뷰 (URL view=graph) ── */}
        {activeView === 'graph' && (
          <Suspense>
            <GraphPresetView />
          </Suspense>
        )}

        {/* ── 트리 풀레이어 (URL view=tree-full) — 위젯 그리드 자체 대체 ── */}
        {urlView === 'tree-full' && (
          <Suspense>
            <TreeFullLayer />
          </Suspense>
        )}

        {/* ── 트리 미리보기 오버레이 (URL view=tree-preview) — 위젯 위에 dim ── */}
        {urlView === 'tree-preview' && (
          <Suspense>
            <TreePresetOverlay />
          </Suspense>
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

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
