'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { DotsSixVertical } from '@phosphor-icons/react';

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
};

export type LayoutPositions = Record<number, { x: number; y: number; w: number; h: number }>;

type BlockRect = { index: number; top: number; height: number };

type Guide = {
  y: number;
  dragEdge: 'top' | 'center' | 'bottom';
  targetIndex: number;
};

const SNAP_THRESHOLD = 6;
const GUIDE_COLOR    = '#4DA6FF';

type Props = {
  blocks: TiptapNode[];
  positions: LayoutPositions;
  onPositionsChange: (p: LayoutPositions) => void;
};

export function LayoutModeCanvas({ blocks }: Props) {
  const overlayRef      = useRef<HTMLDivElement>(null);
  const [rects, setRects]         = useState<BlockRect[]>([]);
  const [dragging, setDragging]   = useState<number | null>(null);
  const [dragY, setDragY]         = useState(0);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [guides, setGuides]       = useState<Guide[]>([]);

  const dragStartY  = useRef(0);
  const dragOrigTop = useRef(0);
  const draggingRef = useRef<number | null>(null);
  const rectsRef    = useRef<BlockRect[]>([]);

  // rectsRef 동기화
  useEffect(() => { rectsRef.current = rects; }, [rects]);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);

  // ── ProseMirror 블록 위치 측정 ────────────────────────────────
  const measureBlocks = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    // overlay의 origin을 기준으로 블록 좌표 계산
    const overlayTop = overlay.getBoundingClientRect().top;
    const container  = overlay.parentElement;
    if (!container) return;
    const editorEl = container.querySelector('.ProseMirror');
    if (!editorEl) return;
    const children = Array.from(editorEl.children) as HTMLElement[];
    if (children.length === 0) return;
    setRects(children.map((el, i) => {
      const r = el.getBoundingClientRect();
      return { index: i, top: r.top - overlayTop, height: r.height };
    }));
  }, []);

  useEffect(() => {
    measureBlocks();
    const t1 = setTimeout(measureBlocks, 100);
    const t2 = setTimeout(measureBlocks, 500);

    let observer: MutationObserver | null = null;
    const container = overlayRef.current?.parentElement;
    if (container) {
      observer = new MutationObserver(() => requestAnimationFrame(measureBlocks));
      observer.observe(container, { childList: true, subtree: true });
    }
    window.addEventListener('resize', measureBlocks);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer?.disconnect();
      window.removeEventListener('resize', measureBlocks);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureBlocks]);

  // ── 스마트 가이드 계산 ────────────────────────────────────────
  const computeSnap = useCallback((rawTop: number, dragIdx: number, currentRects: BlockRect[]): { snappedY: number; guides: Guide[] } => {
    const dragH   = currentRects[dragIdx]?.height ?? 20;

    let snappedY      = rawTop;
    const hitGuides: Guide[] = [];
    let bestDist      = SNAP_THRESHOLD + 1;

    for (const rect of currentRects) {
      if (rect.index === dragIdx) continue;

      const snapPoints: { y: number; dragEdge: Guide['dragEdge'] }[] = [
        { y: rect.top,                                    dragEdge: 'top'    },
        { y: rect.top + rect.height / 2,                 dragEdge: 'top'    },
        { y: rect.top + rect.height,                     dragEdge: 'top'    },
        { y: rect.top - dragH / 2,                       dragEdge: 'center' },
        { y: rect.top + rect.height / 2 - dragH / 2,    dragEdge: 'center' },
        { y: rect.top + rect.height - dragH / 2,         dragEdge: 'center' },
        { y: rect.top - dragH,                           dragEdge: 'bottom' },
        { y: rect.top + rect.height / 2 - dragH,        dragEdge: 'bottom' },
        { y: rect.top + rect.height - dragH,             dragEdge: 'bottom' },
      ];

      for (const sp of snapPoints) {
        const dist = Math.abs(rawTop - sp.y);
        if (dist <= SNAP_THRESHOLD) {
          if (dist < bestDist) {
            bestDist = dist;
            snappedY = sp.y;
          }
          const guideY =
            sp.dragEdge === 'top'    ? sp.y :
            sp.dragEdge === 'center' ? sp.y + dragH / 2 :
                                       sp.y + dragH;
          if (!hitGuides.find(g => Math.abs(g.y - guideY) < 2)) {
            hitGuides.push({ y: guideY, dragEdge: sp.dragEdge, targetIndex: rect.index });
          }
        }
      }
    }

    return { snappedY, guides: hitGuides };
  }, []);

  // ── 드래그 핸들러 — window 이벤트로 등록 ──────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = rectsRef.current[index];
    setDragging(index);
    setDragY(rect?.top ?? 0);
    setOverIndex(index);
    dragStartY.current  = e.clientY;
    dragOrigTop.current = rect?.top ?? 0;
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const dragIdx = draggingRef.current;
      if (dragIdx === null) return;
      const currentRects = rectsRef.current;
      const rawTop = dragOrigTop.current + (e.clientY - dragStartY.current);

      const { snappedY, guides: newGuides } = computeSnap(rawTop, dragIdx, currentRects);
      setDragY(snappedY);
      setGuides(newGuides);

      const mid    = snappedY + (currentRects[dragIdx]?.height ?? 20) / 2;
      const target = currentRects.find(r => r.index !== dragIdx && mid >= r.top && mid <= r.top + r.height);
      setOverIndex(target?.index ?? null);
    };

    const onUp = () => {
      if (draggingRef.current === null) return;
      setDragging(null);
      setOverIndex(null);
      setGuides([]);
      setTimeout(measureBlocks, 50);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [computeSnap, measureBlocks]);

  if (rects.length === 0) return null;

  const draggedH = dragging !== null ? (rects[dragging]?.height ?? 20) : 0;

  return (
    <div
      ref={overlayRef}
      style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}
    >
      {/* 레이아웃 모드 배너 */}
      <div style={{
        position: 'absolute', top: -28, left: 0, right: 0,
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, color: 'var(--ou-text-disabled)', letterSpacing: '0.08em',
        userSelect: 'none', pointerEvents: 'none',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--ou-border-faint)' }} />
        레이아웃 모드 — 핸들을 드래그해 블록 순서 변경
        <div style={{ flex: 1, height: 1, background: 'var(--ou-border-faint)' }} />
      </div>

      {/* 드래그 핸들 + 드롭 인디케이터 */}
      {rects.map((rect) => (
        <div key={rect.index}>
          <div
            onPointerDown={(e) => handlePointerDown(e, rect.index)}
            style={{
              position: 'absolute',
              left: -28, top: rect.top + rect.height / 2 - 10,
              width: 20, height: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4,
              background: dragging === rect.index ? 'var(--ou-surface-muted)' : 'transparent',
              border: `1px solid ${dragging === rect.index ? 'var(--ou-border-subtle)' : 'transparent'}`,
              cursor: dragging === rect.index ? 'grabbing' : 'grab',
              pointerEvents: 'all',
              color: 'var(--ou-text-disabled)',
              opacity: dragging === rect.index ? 1 : 0.5,
              transition: 'opacity 100ms',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.opacity = '1';
              el.style.background = 'var(--ou-surface-muted)';
              el.style.borderColor = 'var(--ou-border-subtle)';
            }}
            onMouseLeave={(e) => {
              if (dragging !== rect.index) {
                const el = e.currentTarget as HTMLElement;
                el.style.opacity = '0.5';
                el.style.background = 'transparent';
                el.style.borderColor = 'transparent';
              }
            }}
          >
            <DotsSixVertical size={13} />
          </div>

          {/* 드롭 인디케이터 */}
          {overIndex === rect.index && dragging !== null && dragging !== rect.index && (
            <div style={{
              position: 'absolute', left: -4, right: -4,
              top: rect.top - 1,
              height: 2, borderRadius: 2,
              background: GUIDE_COLOR,
              pointerEvents: 'none',
              boxShadow: `0 0 6px ${GUIDE_COLOR}66`,
            }} />
          )}
        </div>
      ))}

      {/* 드래그 고스트 */}
      {dragging !== null && rects[dragging] && (
        <>
          <div style={{
            position: 'absolute', left: -4, right: -4,
            top: dragY, height: draggedH,
            background: GUIDE_COLOR,
            opacity: 0.07,
            borderRadius: 4,
            border: `1px solid ${GUIDE_COLOR}`,
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', left: -4, right: -4,
            top: dragY + draggedH / 2 - 0.5,
            height: 1,
            background: `${GUIDE_COLOR}44`,
            pointerEvents: 'none',
          }} />
        </>
      )}

      {/* 스마트 가이드 라인 */}
      {guides.map((g, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: -40, right: -12,
          top: g.y - 0.5,
          height: 1,
          background: GUIDE_COLOR,
          opacity: 0.85,
          pointerEvents: 'none',
          zIndex: 6,
          boxShadow: `0 0 4px ${GUIDE_COLOR}88`,
        }}>
          <div style={{
            position: 'absolute', left: 0, top: -3,
            width: 0, height: 0,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderLeft: `6px solid ${GUIDE_COLOR}`,
          }} />
          <div style={{
            position: 'absolute', right: 0, top: -3,
            width: 0, height: 0,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderRight: `6px solid ${GUIDE_COLOR}`,
          }} />
        </div>
      ))}

      {/* 드래그 중 원본 자리 점선 */}
      {dragging !== null && rects[dragging] && (
        <div style={{
          position: 'absolute', left: -4, right: -4,
          top: rects[dragging].top, height: rects[dragging].height,
          border: `1px dashed ${GUIDE_COLOR}44`,
          borderRadius: 4,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}
