'use client';

import { useRef, useCallback } from 'react';
import { TiptapBlockRenderer } from './TiptapBlockRenderer';

// Tiptap JSON 노드 타입 (최소한)
export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
};

// 블록 위치 메타데이터 — 인덱스 기반
export type LayoutPositions = Record<number, { x: number; y: number; w: number; h: number }>;

type Props = {
  /** Tiptap editor.getJSON().content — 단일 소스 */
  blocks: TiptapNode[];
  positions: LayoutPositions;
  onPositionsChange: (positions: LayoutPositions) => void;
};

const DEFAULT_W = 360;
const DEFAULT_H = 80;

/**
 * LayoutModeCanvas
 * Flow 모드와 동일한 blocks (Tiptap JSON)을 받아서
 * 절대좌표로 자유 배치한다.
 *
 * positions는 인덱스 → {x,y,w,h} 맵이며
 * 없으면 자동으로 세로 정렬된 초기값을 계산한다.
 */
export function LayoutModeCanvas({ blocks, positions, onPositionsChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 위치 없으면 자동 초기값 (flow 모드의 세로 정렬 재현)
  const getPos = useCallback(
    (index: number) => {
      if (positions[index]) return positions[index];
      return { x: 48, y: 48 + index * 100, w: DEFAULT_W, h: DEFAULT_H };
    },
    [positions]
  );

  // 드래그 핸들러
  const dragRef = useRef<{
    index: number;
    startX: number; startY: number;
    origX: number; origY: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.stopPropagation();
      const pos = getPos(index);
      dragRef.current = { index, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getPos]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const { index, startX, startY, origX, origY } = dragRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const current = getPos(index);
      onPositionsChange({
        ...positions,
        [index]: { ...current, x: origX + dx, y: origY + dy },
      });
    },
    [positions, getPos, onPositionsChange]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // 리사이즈
  const handleResize = useCallback(
    (index: number, w: number, h: number) => {
      const current = getPos(index);
      onPositionsChange({ ...positions, [index]: { ...current, w, h } });
    },
    [positions, getPos, onPositionsChange]
  );

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '80vh',
        // 점 그리드 배경
        backgroundImage: 'radial-gradient(circle, var(--ou-border-subtle) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {blocks.map((block, index) => {
        const pos = getPos(index);
        return (
          <LayoutBlock
            key={index}
            index={index}
            block={block}
            pos={pos}
            onPointerDown={(e) => handlePointerDown(e, index)}
            onResize={(w, h) => handleResize(index, w, h)}
          />
        );
      })}
    </div>
  );
}

// ── 단일 레이아웃 블록 ─────────────────────────────────────────
function LayoutBlock({
  index, block, pos, onPointerDown, onResize,
}: {
  index: number;
  block: TiptapNode;
  pos: { x: number; y: number; w: number; h: number };
  onPointerDown: (e: React.PointerEvent) => void;
  onResize: (w: number, h: number) => void;
}) {
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  return (
    <div
      onPointerDown={onPointerDown}
      data-layout-block={index}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: pos.w,
        minHeight: pos.h,
        background: 'var(--ou-bg)',
        borderRadius: 'var(--ou-radius-md)',
        boxShadow: 'var(--ou-neu-raised-sm)',
        cursor: 'grab',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 상단 드래그 핸들 바 */}
      <div
        style={{
          height: 8,
          background: 'var(--ou-border-faint)',
          cursor: 'grab',
          borderRadius: '12px 12px 0 0',
        }}
      />

      {/* 블록 내용 */}
      <div style={{ padding: '8px 12px', pointerEvents: 'none' }}>
        <TiptapBlockRenderer node={block} />
      </div>

      {/* 우하단 리사이즈 핸들 */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: pos.w, origH: pos.h };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!resizeRef.current) return;
          const dx = e.clientX - resizeRef.current.startX;
          const dy = e.clientY - resizeRef.current.startY;
          onResize(Math.max(120, resizeRef.current.origW + dx), Math.max(40, resizeRef.current.origH + dy));
        }}
        onPointerUp={() => { resizeRef.current = null; }}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 14,
          height: 14,
          cursor: 'nwse-resize',
          background: 'var(--ou-text-faint)',
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          borderTopLeftRadius: 3,
        }}
      />
    </div>
  );
}
