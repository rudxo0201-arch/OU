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
  const [shakingId, setShakingId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);

  // 롱프레스 → 편집 모드 진입 (800ms, 5px 이내 이동)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (editMode) return;
    longPressStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      setEditMode(true);
      longPressStart.current = null;
    }, 800);
  }, [editMode]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStart.current = null;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!longPressStart.current) return;
    const dx = e.clientX - longPressStart.current.x;
    const dy = e.clientY - longPressStart.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) cancelLongPress();
  }, [cancelLongPress]);

  // Broadcast edit mode changes with { active } detail
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('widget-edit-mode-change', { detail: { active: editMode } }));
  }, [editMode]);

  // ESC to exit edit mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editMode) setEditMode(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editMode]);

  // widget-edit-mode-enter → toggle (DockBar 완료 버튼도 이 이벤트 사용)
  useEffect(() => {
    const handler = () => setEditMode(prev => !prev);
    window.addEventListener('widget-edit-mode-enter', handler);
    return () => window.removeEventListener('widget-edit-mode-enter', handler);
  }, []);


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

  const handleResizeStop = useCallback((_layout: Layout[], ...rest: unknown[]) => {
    // 최솟값 도달 감지 → shake 피드백
    const oldItem = rest[0] as Layout | undefined;
    const newItem = rest[1] as Layout | undefined;
    if (oldItem && newItem) {
      const widget = widgets.find(w => w.id === newItem.i);
      if (widget) {
        const def = getWidgetDef(widget.type);
        if (def) {
          const atMin = newItem.w <= def.minSize[0] || newItem.h <= def.minSize[1];
          const unchanged = newItem.w === oldItem.w && newItem.h === oldItem.h;
          if (atMin && unchanged) {
            setShakingId(newItem.i);
            setTimeout(() => setShakingId(null), 450);
          }
        }
      }
    }
    requestAnimationFrame(() => handleLayoutChange(_layout));
  }, [handleLayoutChange, widgets]);

  const handleRemove = useCallback((id: string) => {
    const def = getWidgetDef(widgets.find(w => w.id === id)?.type ?? '');
    if (def && !def.removable) return;
    removeWidget(id);
  }, [widgets, removeWidget]);

  // 컴팩션 없음 + 충돌 방지: 드래그한 위치 그대로 유지 (macOS 스타일)
  const compactor = useMemo(() => getCompactor(null, false, true), []);

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
    <div
      ref={containerRef}
      className={styles.gridWrapper}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelLongPress}
      onPointerMove={handlePointerMove}
      onPointerCancel={cancelLongPress}
    >

      {/* 완료 버튼은 DockBar가 담당 */}
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
                isShaking={shakingId === w.id}
              />
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
