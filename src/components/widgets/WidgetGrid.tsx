'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { GridLayout, getCompactor } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

import { useWidgetStore } from '@/stores/widgetStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { getWidgetDef } from './registry';
import { GRID_COLS as DEFAULT_COLS, GRID_ROWS as DEFAULT_ROWS } from './types';
import { WidgetCard } from './WidgetCard';
import styles from './WidgetGrid.module.css';

import './views/register';

export type GridTransition = 'idle' | 'exiting' | 'entering';

interface Props {
  transition?: GridTransition;
}

function getExitDirection(x: number): 'left' | 'up' | 'right' {
  if (x <= 1) return 'left';
  if (x >= 4) return 'right';
  return 'up';
}

function getExitOrder(widgets: Array<{ x: number; id: string }>): string[] {
  // Edges first (left/right), then center (up)
  const left = widgets.filter(w => w.x <= 1);
  const right = widgets.filter(w => w.x >= 4);
  const center = widgets.filter(w => w.x > 1 && w.x < 4);
  return [...left, ...right, ...center].map(w => w.id);
}

export function WidgetGrid({ transition = 'idle' }: Props) {
  const { updateLayout, removeWidget } = useWidgetStore();
  const widgets = useWidgetStore(s => s.pages[s.currentPageIndex]?.widgets ?? []);
  const GRID_COLS = useWidgetStore(s => s.gridCols) || DEFAULT_COLS;
  const GRID_ROWS = useWidgetStore(s => s.gridRows) || DEFAULT_ROWS;
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Context menu (right-click → edit mode)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!editMode) {
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  }, [editMode]);

  // Broadcast edit mode changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('widget-edit-mode-change', { detail: { editMode } }));
  }, [editMode]);

  // ESC to exit edit mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editMode) setEditMode(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editMode]);

  // widget-edit-mode-enter event → 편집 모드 진입
  useEffect(() => {
    const handler = () => setEditMode(true);
    window.addEventListener('widget-edit-mode-enter', handler);
    return () => window.removeEventListener('widget-edit-mode-enter', handler);
  }, []);

  // Close context menu on click anywhere
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const calcDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const gaps = (GRID_ROWS - 1) * 10;
    const available = rect.height - gaps;
    setRowHeight(Math.max(40, Math.floor(available / GRID_ROWS)));
    setGridWidth(rect.width);
  }, []);

  useEffect(() => {
    setMounted(true);
    calcDimensions();
    window.addEventListener('resize', calcDimensions);
    return () => window.removeEventListener('resize', calcDimensions);
  }, [calcDimensions]);

  // Only persist layout on drag/resize END to avoid mid-gesture re-renders
  const handleLayoutChange = useCallback((layout: Layout[]) => {
    updateLayout(layout.map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
  }, [updateLayout]);

  // rAF로 한 프레임 미뤄서 CSS 트랜지션과 상태 업데이트 겹침 방지
  const handleDragStop = useCallback((_layout: Layout[]) => {
    requestAnimationFrame(() => handleLayoutChange(_layout));
  }, [handleLayoutChange]);

  const handleResizeStop = useCallback((_layout: Layout[]) => {
    requestAnimationFrame(() => handleLayoutChange(_layout));
  }, [handleLayoutChange]);

  const handleRemove = useCallback((id: string) => {
    const def = getWidgetDef(widgets.find(w => w.id === id)?.type ?? '');
    if (def && !def.removable) return;
    removeWidget(id);
  }, [widgets, removeWidget]);

  // preventCollision: 드래그 시 다른 위젯을 밀어내지 않음 (macOS 스타일)
  const compactor = useMemo(() => getCompactor('vertical', false, true), []);

  const exitOrder = useMemo(() => getExitOrder(widgets), [widgets]);

  if (!mounted || rowHeight === 0 || gridWidth === 0) {
    return <div ref={containerRef} className={styles.gridWrapper} />;
  }

  const layout: Layout[] = widgets.map(w => {
    const def = getWidgetDef(w.type);
    return {
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: def?.minSize[0] ?? 1,
      minH: def?.minSize[1] ?? 1,
    };
  });

  const isAnimating = transition === 'exiting' || transition === 'entering';

  return (
    <div ref={containerRef} className={styles.gridWrapper} onContextMenu={handleContextMenu}>
      {/* Context menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 100,
          padding: '4px 0', borderRadius: 10,
          background: 'rgba(30,32,40,0.95)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          minWidth: 160,
          animation: 'ou-scale-in 0.15s ease',
        }}>
          <button
            onClick={() => { setEditMode(true); setContextMenu(null); }}
            style={{
              width: '100%', padding: '8px 16px', textAlign: 'left',
              fontSize: 13, color: 'rgba(255,255,255,0.8)',
              borderRadius: 6, transition: '100ms ease',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
          >
            편집하기
          </button>
        </div>
      )}

      {/* Edit mode "완료" button */}
      {editMode && (
        <button
          onClick={() => {
            setEditMode(false);
            const store = useTutorialStore.getState();
            if (store.isEditMode()) {
              store.exitEditMode();
              window.dispatchEvent(new CustomEvent('orb-expand'));
            }
          }}
          style={{
            position: 'absolute', top: -36, right: 0, zIndex: 20,
            padding: '6px 20px', borderRadius: 999,
            background: 'rgba(255,255,255,0.9)', color: '#111',
            fontSize: 13, fontWeight: 600,
            transition: '180ms ease',
          }}
        >
          완료
        </button>
      )}
      <GridLayout
        layout={layout}
        width={gridWidth}
        autoSize={false}
        gridConfig={{
          cols: GRID_COLS,
          rowHeight,
          maxRows: GRID_ROWS,
          margin: [10, 10] as [number, number],
          containerPadding: [0, 0] as [number, number],
        }}
        compactor={compactor}
        dragConfig={{
          enabled: editMode && !isAnimating,
          cancel: '.widget-no-drag',
        }}
        resizeConfig={{
          enabled: editMode && !isAnimating,
          handles: ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'],
        }}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
      >
        {widgets.map(w => {
          const def = getWidgetDef(w.type);
          const dir = getExitDirection(w.x);
          const orderIdx = exitOrder.indexOf(w.id);
          const delay = transition === 'exiting'
            ? orderIdx * 60
            : (exitOrder.length - 1 - orderIdx) * 60;

          const animClass =
            transition === 'exiting' ? styles[`exit_${dir}`] :
            transition === 'entering' ? styles[`enter_${dir}`] :
            '';

          return (
            <div
              key={w.id}
              style={{
                animationDelay: isAnimating ? `${delay}ms` : undefined,
              }}
              className={animClass}
            >
              <WidgetCard
                widgetId={w.id}
                type={w.type}
                removable={def?.removable ?? true}
                onRemove={() => handleRemove(w.id)}
                editMode={editMode}
              />
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
