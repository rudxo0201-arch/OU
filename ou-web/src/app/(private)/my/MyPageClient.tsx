'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { GraphViewHandle } from '@/components/graph/GraphView';
import { useAuth } from '@/hooks/useAuth';
import { VIEW_REGISTRY } from '@/components/views/registry';
import { ViewOrbDock, type ViewOrb } from '@/components/ui/ViewOrbDock';
import { GenesisEmptyState } from '@/components/my/GenesisEmptyState';
import { PencilSimple, X, GearSix, Check } from '@phosphor-icons/react';

const GraphView = dynamic(
  () => import('@/components/graph/GraphView').then(m => m.GraphView),
  { ssr: false }
);
const ChatPanel = dynamic(
  () => import('@/components/chat/ChatPanel').then(m => m.ChatPanel),
  { ssr: false }
);

/* ── 뷰 블록 타입 ── */
interface ViewBlock {
  id: string;
  viewType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

const STORAGE_KEY = 'ou-view-layout';

function loadLayout(): ViewBlock[] {
  if (typeof window === 'undefined') return getDefaultLayout();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return getDefaultLayout();
}

function saveLayout(views: ViewBlock[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(views)); } catch { /* ignore */ }
}

function getDefaultLayout(): ViewBlock[] {
  return [
    { id: 'chat', viewType: 'chat', x: 16, y: 16, width: 360, height: -1, zIndex: 10 },
  ];
}

/* ── 메인 컴포넌트 ── */
interface MyPageClientProps {
  savedViews: any[];
  nodes: any[];
  links?: Array<{ source: string; target: string; label?: string }>;
}

export function MyPageClient({ savedViews: initialSavedViews, nodes: initialNodes, links: initialLinks = [] }: MyPageClientProps) {
  const [nodes, setNodes] = useState(initialNodes);
  const [savedViews] = useState(initialSavedViews);
  const [views, setViews] = useState<ViewBlock[]>(loadLayout);
  const [editMode, setEditMode] = useState(false);
  const [topZ, setTopZ] = useState(20);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const graphRef = useRef<GraphViewHandle>(null);
  const { isAdmin } = useAuth();

  // 레이아웃 저장
  useEffect(() => { saveLayout(views); }, [views]);

  const handleNodeCreated = useCallback((node: { id: string; domain: string; raw: string }) => {
    setNodes(prev => [...prev, { ...node, importance: 1, created_at: new Date().toISOString() }]);
    graphRef.current?.addNode({ ...node, importance: 1 });
  }, []);

  /* ── 뷰 블록 관리 ── */
  const bringToFront = useCallback((id: string) => {
    setTopZ(z => z + 1);
    setViews(prev => prev.map(v => v.id === id ? { ...v, zIndex: topZ + 1 } : v));
  }, [topZ]);

  const removeView = useCallback((id: string) => {
    setViews(prev => prev.filter(v => v.id !== id));
  }, []);

  const addView = useCallback((viewType: string) => {
    const id = `${viewType}-${Date.now()}`;
    setTopZ(z => z + 1);
    setViews(prev => [...prev, {
      id, viewType,
      x: 200 + Math.random() * 200,
      y: 80 + Math.random() * 100,
      width: 480, height: 400,
      zIndex: topZ + 1,
    }]);
    setShowAddMenu(false);
  }, [topZ]);

  /* ── 드래그 ── */
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onDragStart = useCallback((id: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    const view = views.find(v => v.id === id);
    if (!view) return;
    bringToFront(id);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setViews(prev => prev.map(v => v.id === dragRef.current!.id
        ? { ...v, x: Math.max(0, dragRef.current!.origX + dx), y: Math.max(0, dragRef.current!.origY + dy) }
        : v
      ));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [editMode, views, bringToFront]);

  /* ── 리사이즈 ── */
  const resizeRef = useRef<{ id: string; startX: number; startY: number; origW: number; origH: number } | null>(null);

  const onResizeStart = useCallback((id: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const view = views.find(v => v.id === id);
    if (!view) return;
    resizeRef.current = { id, startX: e.clientX, startY: e.clientY, origW: view.width, origH: view.height > 0 ? view.height : 600 };

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dw = ev.clientX - resizeRef.current.startX;
      const dh = ev.clientY - resizeRef.current.startY;
      setViews(prev => prev.map(v => v.id === resizeRef.current!.id
        ? { ...v, width: Math.max(280, resizeRef.current!.origW + dw), height: Math.max(200, resizeRef.current!.origH + dh) }
        : v
      ));
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [editMode, views]);

  /* ── Orb 데이터 ── */
  const viewOrbs: ViewOrb[] = views
    .filter(v => v.viewType !== 'chat')
    .map(v => ({ id: v.id, label: v.viewType, active: true }));

  /* ── 렌더링 ── */
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* 우주 배경 */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--ou-space, #060810)' }} />

      {/* 그래프 (우주 자체) */}
      {nodes.length > 0 ? (
        <GraphView
          ref={graphRef}
          nodes={nodes}
          links={initialLinks}
          fullscreen
          onNodeSelect={() => {}}
        />
      ) : (
        <GenesisEmptyState />
      )}

      {/* 뷰 블록들 — 우주와 같은 레이어 */}
      {views.map(view => {
        const isChat = view.viewType === 'chat';
        const ViewComp = isChat ? null : VIEW_REGISTRY[view.viewType];
        const viewHeight = view.height === -1 ? 'calc(100vh - 32px)' : view.height;

        return (
          <div
            key={view.id}
            onClick={() => bringToFront(view.id)}
            style={{
              position: 'absolute',
              left: view.x,
              top: view.y,
              width: view.width,
              height: viewHeight,
              zIndex: view.zIndex,
              background: 'var(--ou-surface-subtle, rgba(255,255,255,0.03))',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: editMode
                ? '1px dashed var(--ou-border-hover, rgba(255,255,255,0.25))'
                : '0.5px solid var(--ou-border-subtle, rgba(255,255,255,0.10))',
              borderRadius: 16,
              boxShadow: 'var(--ou-glow-sm)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: editMode ? 'none' : 'box-shadow 150ms',
            }}
          >
            {/* 편집 모드: 드래그 핸들 + 닫기 */}
            {editMode && (
              <div
                onMouseDown={e => onDragStart(view.id, e)}
                style={{
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'grab',
                  borderBottom: '0.5px solid var(--ou-border-faint)',
                  fontSize: 11,
                  color: 'var(--ou-text-dimmed)',
                  userSelect: 'none',
                }}
              >
                <span>{view.viewType === 'chat' ? 'OU' : view.viewType}</span>
                {view.viewType !== 'chat' && (
                  <button
                    onClick={e => { e.stopPropagation(); removeView(view.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ou-text-dimmed)', padding: 2 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* 뷰 콘텐츠 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {isChat ? (
                <ChatPanel onNodeCreated={handleNodeCreated} />
              ) : ViewComp ? (
                <ViewComp
                  nodes={nodes.filter(n => {
                    // 뷰 타입에 맞는 도메인 필터링 (간단한 매핑)
                    const domainMap: Record<string, string> = {
                      calendar: 'schedule', chart: 'finance', task: 'task',
                      heatmap: 'habit', journal: 'emotion', mindmap: 'idea',
                      knowledge_graph: 'knowledge', relationship: 'relation',
                    };
                    const targetDomain = domainMap[view.viewType];
                    return targetDomain ? n.domain === targetDomain : true;
                  })}
                />
              ) : (
                <div style={{ padding: 24, color: 'var(--ou-text-dimmed)', fontSize: 13 }}>
                  {view.viewType} 뷰
                </div>
              )}
            </div>

            {/* 편집 모드: 리사이즈 핸들 */}
            {editMode && (
              <div
                onMouseDown={e => onResizeStart(view.id, e)}
                style={{
                  position: 'absolute', right: 0, bottom: 0,
                  width: 20, height: 20,
                  cursor: 'nwse-resize',
                }}
              />
            )}
          </div>
        );
      })}

      {/* 편집 모드 토글 */}
      <button
        onClick={() => setEditMode(prev => !prev)}
        title={editMode ? '편집 완료' : '레이아웃 편집'}
        style={{
          position: 'fixed', top: 20, left: 70, zIndex: 30,
          background: 'none', border: 'none', cursor: 'pointer',
          color: editMode ? 'var(--ou-text-bright)' : 'var(--ou-text-dimmed)',
          transition: 'color 150ms',
        }}
      >
        {editMode ? <Check size={18} weight="bold" /> : <PencilSimple size={18} weight="light" />}
      </button>

      {/* Orb Dock — 우측 세로 가운데 */}
      <ViewOrbDock
        orbs={viewOrbs}
        onOrbClick={id => bringToFront(id)}
        onAddClick={() => setShowAddMenu(true)}
        editMode={editMode}
      />

      {/* 뷰 추가 메뉴 */}
      {showAddMenu && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowAddMenu(false)}
          />
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'var(--ou-surface-subtle)', backdropFilter: 'blur(24px)',
            border: '0.5px solid var(--ou-border-subtle)', borderRadius: 16,
            padding: 24, maxWidth: 400, width: '90%',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--ou-text-strong)' }}>
              뷰 추가
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['calendar', 'chart', 'task', 'heatmap', 'journal', 'timeline', 'mindmap', 'knowledge_graph', 'flashcard', 'table', 'dashboard', 'gantt', 'matrix', 'quiz', 'gallery', 'treemap'].map(vt => (
                <button
                  key={vt}
                  onClick={() => addView(vt)}
                  className="pill-block"
                >
                  {vt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
