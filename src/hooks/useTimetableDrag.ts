'use client';

import { useCallback, useRef, useState } from 'react';

const SNAP_MINUTES = 15;

function snapTo(min: number) { return Math.round(min / SNAP_MINUTES) * SNAP_MINUTES; }
function clamp(val: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, val)); }

export interface DragColumn {
  id: string;   // 날짜('YYYY-MM-DD') 또는 카테고리 이름
}

export interface DragState {
  nodeId: string;
  domainData: Record<string, unknown>;
  originalDuration: number;
  offsetMinY: number;
  ghostTop: number;
  ghostLeft: number;
  ghostWidth: number;
  previewColId: string;
  previewStartMin: number;
}

interface UseTimetableDragOptions {
  gridRef: React.RefObject<HTMLElement>;
  hourStart: number;
  hourEnd: number;
  cellHeight: number;
  columns: DragColumn[];
  colOffset: number;  // px — 시간 축 너비
  onUpdate: (
    nodeId: string,
    colId: string,
    startTime: string,
    endTime: string,
    domainData: Record<string, unknown>,
  ) => void;
}

export function useTimetableDrag({
  gridRef, hourStart, hourEnd, cellHeight,
  columns, colOffset, onUpdate,
}: UseTimetableDragOptions) {
  const [dragging, setDragging] = useState<DragState | null>(null);
  const ref = useRef<DragState | null>(null);
  const moveRef = useRef<((e: PointerEvent) => void) | null>(null);
  const upRef   = useRef<((e: PointerEvent) => void) | null>(null);

  const totalMins  = (hourEnd - hourStart) * 60;
  const gridHeight = cellHeight * (hourEnd - hourStart);

  const calc = useCallback((
    clientX: number, clientY: number,
    duration: number, offsetMinY: number,
  ) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const colCount = columns.length;

    // Y → 시간
    const relY     = clamp(clientY - rect.top - (offsetMinY / 60 * cellHeight), 0, gridHeight - (duration / 60 * cellHeight));
    const rawMin   = hourStart * 60 + (relY / gridHeight) * totalMins;
    const startMin = clamp(snapTo(rawMin), hourStart * 60, (hourEnd - 1) * 60);

    // X → 컬럼
    const colW     = (rect.width - colOffset) / colCount;
    const relX     = clientX - rect.left - colOffset;
    const colIdx   = clamp(Math.floor(relX / colW), 0, colCount - 1);
    const colId    = columns[colIdx]?.id ?? columns[0].id;

    const ghostTop   = (startMin - hourStart * 60) / totalMins * gridHeight;
    const ghostLeft  = colOffset + colIdx * colW + 3;
    const ghostWidth = colW - 6;

    return { colId, startMin, ghostTop, ghostLeft, ghostWidth };
  }, [gridRef, hourStart, hourEnd, cellHeight, totalMins, gridHeight, columns, colOffset]);

  const handlePointerDown = useCallback((
    e: React.PointerEvent,
    nodeId: string,
    domainData: Record<string, unknown>,
    blockTopPx: number,
    startMin: number,
    duration: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const clickYInGrid = e.clientY - rect.top;
    const offsetMinY   = clamp((clickYInGrid - blockTopPx) / cellHeight * 60, 0, duration - 15);

    const initial = calc(e.clientX, e.clientY, duration, offsetMinY);
    if (!initial) return;

    const state: DragState = {
      nodeId, domainData, originalDuration: duration, offsetMinY,
      ghostTop: initial.ghostTop, ghostLeft: initial.ghostLeft, ghostWidth: initial.ghostWidth,
      previewColId: initial.colId, previewStartMin: initial.startMin,
    };
    ref.current = state;
    setDragging(state);

    const onMove = (ev: PointerEvent) => {
      const cur = ref.current;
      if (!cur) return;
      const r = calc(ev.clientX, ev.clientY, cur.originalDuration, cur.offsetMinY);
      if (!r) return;
      const next: DragState = { ...cur, ghostTop: r.ghostTop, ghostLeft: r.ghostLeft, ghostWidth: r.ghostWidth, previewColId: r.colId, previewStartMin: r.startMin };
      ref.current = next;
      setDragging(next);
    };

    const onUp = (ev: PointerEvent) => {
      const cur = ref.current;
      if (!cur) return;
      const r = calc(ev.clientX, ev.clientY, cur.originalDuration, cur.offsetMinY);
      if (r) {
        const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`;
        const endMin = r.startMin + cur.originalDuration;
        onUpdate(cur.nodeId, r.colId, fmt(r.startMin), fmt(endMin), cur.domainData);
      }
      ref.current = null;
      setDragging(null);
      document.removeEventListener('pointermove', moveRef.current!);
      document.removeEventListener('pointerup',   upRef.current!);
    };

    moveRef.current = onMove;
    upRef.current   = onUp;
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup',   onUp);
  }, [calc, onUpdate, cellHeight, gridRef]);

  return { dragging, handlePointerDown };
}
