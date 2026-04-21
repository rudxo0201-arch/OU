'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import { useStudioStore } from './studioStore';
import { ElementWrapper } from './ElementWrapper';
import { SelectionOverlay } from './SelectionOverlay';
import { SmartGuides } from './SmartGuides';
import { GridOverlay } from './GridOverlay';
import { usePointerEngine } from './hooks/usePointerEngine';
import { useViewport } from './hooks/useViewport';
import { useKeyboard } from './hooks/useKeyboard';
import type { ResizeHandle } from './types';
import styles from './StudioCanvas.module.css';
import '@/components/widgets/views/register';

interface Props {
  width?: number;
  height?: number;
  editMode?: boolean;
}

export function StudioCanvas({ width = 1600, height = 900, editMode = true }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [, forceUpdate] = useState(0);

  const elements = useStudioStore(s => s.elements);
  const selectedIds = useStudioStore(s => s.selectedIds);
  const viewport = useStudioStore(s => s.viewport);
  const snapToGrid = useStudioStore(s => s.snapToGrid);
  const gridSize = useStudioStore(s => s.gridSize);
  const activeGuides = useStudioStore(s => s.activeGuides);
  const { toggleSnap, resetViewport } = useStudioStore();

  // 뷰포트 (팬/줌)
  useViewport(canvasRef);

  // 키보드
  useKeyboard(useCallback((held: boolean) => setSpaceHeld(held), []));

  // 포인터 엔진 (마키는 ref 기반으로 forceUpdate로 반영)
  const {
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onElementPointerDown,
    onResizeHandlePointerDown,
  } = usePointerEngine(canvasRef, spaceHeld, marqueeRef);

  // 마키를 주기적으로 읽어 렌더 반영
  // (marqueeRef는 ref라서 setState 없이 변경됨 — pointermove에서 직접 forceUpdate 호출)
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    onCanvasPointerMove(e);
    // 마키 상태 변화 시 리렌더
    forceUpdate(n => n + 1);
  }, [onCanvasPointerMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    onCanvasPointerUp(e);
    forceUpdate(n => n + 1);
  }, [onCanvasPointerUp]);

  const selectedElements = useMemo(
    () => elements.filter(el => selectedIds.includes(el.id)),
    [elements, selectedIds],
  );

  const worldStyle: React.CSSProperties = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    transformOrigin: '0 0',
    width,
    height,
    position: 'absolute',
    top: 0,
    left: 0,
  };

  return (
    <div
      ref={canvasRef}
      className={[styles.canvas, spaceHeld ? styles.panning : ''].join(' ')}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 툴바 */}
      <div className={styles.toolbar}>
        <button
          className={[styles.snapBtn, snapToGrid ? styles.active : ''].join(' ')}
          onClick={toggleSnap}
          title="G"
        >
          {snapToGrid ? '✦ SNAP' : '◇ FREE'}
        </button>
        <span className={styles.zoomLabel}>{Math.round(viewport.zoom * 100)}%</span>
        <button className={styles.snapBtn} onClick={resetViewport} title="⌘0">
          Reset
        </button>
      </div>

      {/* 월드 (팬/줌 적용) */}
      <div style={worldStyle}>
        {snapToGrid && (
          <GridOverlay width={width} height={height} gridSize={gridSize} />
        )}
        {elements.map(el => (
          <ElementWrapper
            key={el.id}
            element={el}
            selected={selectedIds.includes(el.id)}
            interacting={false}
            editMode={editMode}
            onPointerDown={onElementPointerDown}
          />
        ))}
      </div>

      {/* 선택 오버레이 (화면 좌표) */}
      <SelectionOverlay
        selected={selectedElements}
        marquee={marqueeRef.current}
        viewport={viewport}
        onResizeHandlePointerDown={(e: React.PointerEvent, id: string, handle: ResizeHandle) =>
          onResizeHandlePointerDown(e, id, handle)
        }
      />

      {/* 스마트 가이드 */}
      <SmartGuides
        guides={activeGuides}
        canvasWidth={width}
        canvasHeight={height}
        viewport={viewport}
      />
    </div>
  );
}
