'use client';

import { useRef, useCallback, RefObject, MutableRefObject } from 'react';
import type { ResizeHandle, Rect, Guide } from '../types';
import { screenToCanvas, normalizeRect, rectsIntersect } from '../math';
import { calcResize } from './useResize';
import { calcSmartGuides } from './useSmartGuides';
import { applyGridSnap } from './useSnap';
import { useStudioStore } from '../studioStore';

const DRAG_THRESHOLD = 3; // px

interface PointerEngineResult {
  onCanvasPointerDown: (e: React.PointerEvent) => void;
  onCanvasPointerMove: (e: React.PointerEvent) => void;
  onCanvasPointerUp: (e: React.PointerEvent) => void;
  onElementPointerDown: (e: React.PointerEvent, elementId: string) => void;
  onResizeHandlePointerDown: (e: React.PointerEvent, elementId: string, handle: ResizeHandle) => void;
  marquee: { x: number; y: number; width: number; height: number } | null;
}

type InteractionState =
  | { kind: 'idle' }
  | { kind: 'pending-drag'; pointerId: number; startX: number; startY: number; elementId: string; wasSelected: boolean }
  | { kind: 'dragging'; pointerId: number; startCanvasX: number; startCanvasY: number; startRects: Map<string, Rect> }
  | { kind: 'pending-marquee'; pointerId: number; startX: number; startY: number }
  | { kind: 'marquee'; pointerId: number; startCanvasX: number; startCanvasY: number; currentCanvasX: number; currentCanvasY: number }
  | { kind: 'resizing'; pointerId: number; elementId: string; handle: ResizeHandle; startCanvasX: number; startCanvasY: number; startRect: Rect }
  | { kind: 'panning'; pointerId: number; startScreenX: number; startScreenY: number; startVpX: number; startVpY: number };

export function usePointerEngine(
  canvasRef: RefObject<HTMLDivElement | null>,
  spaceHeld: boolean,
  marqueeRef: MutableRefObject<{ x: number; y: number; width: number; height: number } | null>,
): PointerEngineResult {
  const store = useStudioStore;
  const interaction = useRef<InteractionState>({ kind: 'idle' });

  // DOM refs for direct manipulation during drag/resize
  const elementDomRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  function getViewport() { return store.getState().viewport; }
  function getElements() { return store.getState().elements; }
  function getSelectedIds() { return store.getState().selectedIds; }

  function toCanvas(screenX: number, screenY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const vp = getViewport();
    return screenToCanvas(screenX - rect.left, screenY - rect.top, vp.x, vp.y, vp.zoom);
  }

  // 요소 DOM을 직접 이동 (React state 우회, 60fps)
  function applyDomTransform(id: string, x: number, y: number, width?: number, height?: number) {
    const el = canvasRef.current?.querySelector(`[data-element-id="${id}"]`) as HTMLDivElement | null;
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px)`;
    if (width !== undefined) el.style.width = `${width}px`;
    if (height !== undefined) el.style.height = `${height}px`;
  }

  const onCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return; // 요소 위 클릭은 onElementPointerDown에서 처리

    if (spaceHeld) {
      // 팬 모드
      const vp = getViewport();
      interaction.current = { kind: 'panning', pointerId: e.pointerId, startScreenX: e.clientX, startScreenY: e.clientY, startVpX: vp.x, startVpY: vp.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // 마키 준비
    interaction.current = { kind: 'pending-marquee', pointerId: e.pointerId, startX: e.clientX, startY: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (!e.shiftKey) {
      store.getState().clearSelection();
    }
  }, [spaceHeld]);

  const onElementPointerDown = useCallback((e: React.PointerEvent, elementId: string) => {
    e.stopPropagation();

    if (spaceHeld) {
      // 팬 모드
      const vp = getViewport();
      interaction.current = { kind: 'panning', pointerId: e.pointerId, startScreenX: e.clientX, startScreenY: e.clientY, startVpX: vp.x, startVpY: vp.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    const selectedIds = getSelectedIds();
    const wasSelected = selectedIds.includes(elementId);

    if (!wasSelected) {
      store.getState().select([elementId], e.shiftKey);
    }

    interaction.current = {
      kind: 'pending-drag',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      elementId,
      wasSelected,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [spaceHeld]);

  const onResizeHandlePointerDown = useCallback((e: React.PointerEvent, elementId: string, handle: ResizeHandle) => {
    e.stopPropagation();
    const el = getElements().find(el => el.id === elementId);
    if (!el) return;

    const canvasStart = toCanvas(e.clientX, e.clientY);
    interaction.current = {
      kind: 'resizing',
      pointerId: e.pointerId,
      elementId,
      handle,
      startCanvasX: canvasStart.x,
      startCanvasY: canvasStart.y,
      startRect: { x: el.x, y: el.y, width: el.width, height: el.height },
    };
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }, []);

  const onCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    const ix = interaction.current;
    if (ix.kind === 'idle') return;

    if (ix.kind === 'panning') {
      const dx = e.clientX - ix.startScreenX;
      const dy = e.clientY - ix.startScreenY;
      useStudioStore.setState(s => ({
        viewport: { ...s.viewport, x: ix.startVpX + dx, y: ix.startVpY + dy },
      }));
      return;
    }

    if (ix.kind === 'pending-drag') {
      const dx = e.clientX - ix.startX;
      const dy = e.clientY - ix.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

      // 드래그 시작
      const selectedIds = getSelectedIds();
      const elements = getElements();
      const startRects = new Map<string, Rect>();
      for (const id of selectedIds) {
        const el = elements.find(e => e.id === id);
        if (el) startRects.set(id, { x: el.x, y: el.y, width: el.width, height: el.height });
      }
      const canvasStart = toCanvas(ix.startX, ix.startY);
      interaction.current = { kind: 'dragging', pointerId: ix.pointerId, startCanvasX: canvasStart.x, startCanvasY: canvasStart.y, startRects };
      return;
    }

    if (ix.kind === 'pending-marquee') {
      const dx = e.clientX - ix.startX;
      const dy = e.clientY - ix.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

      const canvasStart = toCanvas(ix.startX, ix.startY);
      const canvasCurrent = toCanvas(e.clientX, e.clientY);
      interaction.current = { kind: 'marquee', pointerId: ix.pointerId, startCanvasX: canvasStart.x, startCanvasY: canvasStart.y, currentCanvasX: canvasCurrent.x, currentCanvasY: canvasCurrent.y };
      return;
    }

    if (ix.kind === 'marquee') {
      const canvasCurrent = toCanvas(e.clientX, e.clientY);
      interaction.current = { ...ix, currentCanvasX: canvasCurrent.x, currentCanvasY: canvasCurrent.y };
      const rect = normalizeRect(ix.startCanvasX, ix.startCanvasY, canvasCurrent.x, canvasCurrent.y);
      marqueeRef.current = rect;

      // 마키 안에 있는 요소 선택 (실시간)
      const elements = getElements();
      const hitting = elements.filter(el => rectsIntersect(rect, { x: el.x, y: el.y, width: el.width, height: el.height }));
      store.getState().select(hitting.map(el => el.id), e.shiftKey);
      return;
    }

    if (ix.kind === 'dragging') {
      const canvasCurrent = toCanvas(e.clientX, e.clientY);
      const rawDX = canvasCurrent.x - ix.startCanvasX;
      const rawDY = canvasCurrent.y - ix.startCanvasY;
      const { snapToGrid: snap, gridSize, elements } = useStudioStore.getState();
      const selectedIds = getSelectedIds();

      let guides: Guide[] = [];

      for (const [id, startRect] of Array.from(ix.startRects.entries())) {
        let newX = startRect.x + rawDX;
        let newY = startRect.y + rawDY;

        if (snap) {
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        } else {
          // 스마트 가이드
          const others = elements.filter(el => !selectedIds.includes(el.id));
          const result = calcSmartGuides({ x: newX, y: newY, width: startRect.width, height: startRect.height }, others, getViewport().zoom);
          newX = result.x;
          newY = result.y;
          guides = result.guides;
        }

        applyDomTransform(id, newX, newY);
      }

      useStudioStore.getState().setActiveGuides(guides);
      return;
    }

    if (ix.kind === 'resizing') {
      const canvasCurrent = toCanvas(e.clientX, e.clientY);
      const rawDX = canvasCurrent.x - ix.startCanvasX;
      const rawDY = canvasCurrent.y - ix.startCanvasY;
      const el = getElements().find(el => el.id === ix.elementId);
      if (!el) return;

      const newRect = calcResize({
        handle: ix.handle,
        initialRect: ix.startRect,
        delta: { dx: rawDX, dy: rawDY },
        shift: e.shiftKey,
        alt: e.altKey,
        minWidth: el.minWidth,
        minHeight: el.minHeight,
      });

      const { snapToGrid: snap, gridSize } = useStudioStore.getState();
      const finalRect = snap ? applyGridSnap(newRect.x, newRect.y, newRect.width, newRect.height, gridSize) : newRect;

      applyDomTransform(ix.elementId, finalRect.x, finalRect.y, finalRect.width, finalRect.height);

      return;
    }
  }, [canvasRef, marqueeRef]);

  const onCanvasPointerUp = useCallback((e: React.PointerEvent) => {
    const ix = interaction.current;

    if (ix.kind === 'dragging') {
      // DOM 위치에서 최종 값 읽어 store에 커밋
      const updates: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
      for (const [id, startRect] of Array.from(ix.startRects.entries())) {
        const domEl = canvasRef.current?.querySelector(`[data-element-id="${id}"]`) as HTMLDivElement | null;
        if (!domEl) continue;
        const transform = domEl.style.transform; // translate(Xpx, Ypx)
        const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        if (match) {
          updates.push({ id, x: parseFloat(match[1]), y: parseFloat(match[2]), width: startRect.width, height: startRect.height });
        }
      }
      if (updates.length > 0) store.getState().commitPositions(updates);
      store.getState().setActiveGuides([]);
    }

    if (ix.kind === 'resizing') {
      const domEl = canvasRef.current?.querySelector(`[data-element-id="${ix.elementId}"]`) as HTMLDivElement | null;
      if (domEl) {
        const transform = domEl.style.transform;
        const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        if (match) {
          store.getState().commitPositions([{
            id: ix.elementId,
            x: parseFloat(match[1]),
            y: parseFloat(match[2]),
            width: parseFloat(domEl.style.width),
            height: parseFloat(domEl.style.height),
          }]);
        }
      }
    }

    if (ix.kind === 'marquee' || ix.kind === 'pending-marquee') {
      marqueeRef.current = null;
    }

    // pending-drag → 클릭 (드래그 없이 놓임)
    if (ix.kind === 'pending-drag') {
      if (ix.wasSelected && !e.shiftKey) {
        store.getState().select([ix.elementId]);
      } else if (e.shiftKey && ix.wasSelected) {
        // shift 클릭으로 선택 해제
        store.getState().select(
          getSelectedIds().filter(id => id !== ix.elementId),
        );
      }
    }

    interaction.current = { kind: 'idle' };
  }, [canvasRef, marqueeRef]);

  return {
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onElementPointerDown,
    onResizeHandlePointerDown,
    marquee: marqueeRef.current,
  };
}
