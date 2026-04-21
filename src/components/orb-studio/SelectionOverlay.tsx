'use client';

import type { StudioElement, ResizeHandle } from './types';
import { boundingRect } from './math';

const HANDLE_SIZE = 8;

const ALL_HANDLES: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

function handlePosition(handle: ResizeHandle, rect: { x: number; y: number; width: number; height: number }) {
  const { x, y, width, height } = rect;
  switch (handle) {
    case 'n':  return { x: x + width / 2, y };
    case 's':  return { x: x + width / 2, y: y + height };
    case 'e':  return { x: x + width, y: y + height / 2 };
    case 'w':  return { x, y: y + height / 2 };
    case 'ne': return { x: x + width, y };
    case 'nw': return { x, y };
    case 'se': return { x: x + width, y: y + height };
    case 'sw': return { x, y: y + height };
  }
}

function handleCursor(handle: ResizeHandle): string {
  switch (handle) {
    case 'n': case 's': return 'ns-resize';
    case 'e': case 'w': return 'ew-resize';
    case 'ne': case 'sw': return 'nesw-resize';
    case 'nw': case 'se': return 'nwse-resize';
  }
}

interface Props {
  selected: StudioElement[];
  marquee: { x: number; y: number; width: number; height: number } | null;
  viewport: { x: number; y: number; zoom: number };
  onResizeHandlePointerDown: (e: React.PointerEvent, elementId: string, handle: ResizeHandle) => void;
}

export function SelectionOverlay({ selected, marquee, viewport, onResizeHandlePointerDown }: Props) {
  if (selected.length === 0 && !marquee) return null;

  // canvas → screen 변환
  function cs(v: number, axis: 'x' | 'y'): number {
    return axis === 'x' ? v * viewport.zoom + viewport.x : v * viewport.zoom + viewport.y;
  }
  function csRect(r: { x: number; y: number; width: number; height: number }) {
    return {
      x: cs(r.x, 'x'),
      y: cs(r.y, 'y'),
      width: r.width * viewport.zoom,
      height: r.height * viewport.zoom,
    };
  }

  const isSingle = selected.length === 1;
  const boundRect = selected.length > 0 ? boundingRect(selected.map(e => ({
    x: e.x, y: e.y, width: e.width, height: e.height,
  }))) : null;
  const screenBound = boundRect ? csRect(boundRect) : null;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9998,
        overflow: 'visible',
      }}
    >
      {/* 마키 선택 사각형 */}
      {marquee && (() => {
        const sr = csRect(marquee);
        return (
          <rect
            x={sr.x}
            y={sr.y}
            width={sr.width}
            height={sr.height}
            fill="rgba(100,100,100,0.08)"
            stroke="var(--ou-text-secondary)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        );
      })()}

      {/* 개별 요소 선택 박스 */}
      {selected.map(el => {
        const sr = csRect({ x: el.x, y: el.y, width: el.width, height: el.height });
        return (
          <rect
            key={el.id}
            x={sr.x}
            y={sr.y}
            width={sr.width}
            height={sr.height}
            fill="none"
            stroke="var(--ou-text-secondary)"
            strokeWidth={1.5}
            strokeDasharray={selected.length > 1 ? '4 3' : undefined}
          />
        );
      })}

      {/* 바운딩 박스 (다중 선택) */}
      {selected.length > 1 && screenBound && (
        <rect
          x={screenBound.x}
          y={screenBound.y}
          width={screenBound.width}
          height={screenBound.height}
          fill="none"
          stroke="var(--ou-text-strong)"
          strokeWidth={1.5}
        />
      )}

      {/* 리사이즈 핸들 — 단일 선택만 */}
      {isSingle && screenBound && (() => {
        const el = selected[0];
        return ALL_HANDLES.map(handle => {
          const pos = handlePosition(handle, screenBound);
          return (
            <rect
              key={handle}
              data-handle={handle}
              data-element-id={el.id}
              x={pos.x - HANDLE_SIZE / 2}
              y={pos.y - HANDLE_SIZE / 2}
              width={HANDLE_SIZE}
              height={HANDLE_SIZE}
              rx={2}
              fill="var(--ou-bg)"
              stroke="var(--ou-text-secondary)"
              strokeWidth={1.5}
              style={{ pointerEvents: 'all', cursor: handleCursor(handle) }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(e, el.id, handle);
              }}
            />
          );
        });
      })()}
    </svg>
  );
}
