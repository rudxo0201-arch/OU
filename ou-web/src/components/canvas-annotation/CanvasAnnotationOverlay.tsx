'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from './useCanvasStore';
import { setupCanvas, observeResize } from './engine/canvas-utils';
import {
  extractPoints, drawIncrementalSegment, drawFullStroke,
  predictNextPoint, pressureToWidth, snapToLine,
} from './engine/stroke-engine';
import {
  buildSpatialGrid, hitTestStrokes, removeFromGrid, addToGrid, erasePixels,
} from './engine/eraser-engine';
import {
  findContainedStrokes, drawLassoPath, drawSelectionBounds, offsetStrokes,
} from './engine/lasso-engine';
import type { Point, Vec2, CanvasStroke } from './types';

interface CanvasAnnotationOverlayProps {
  nodeId: string;
  children: React.ReactNode;
}

export function CanvasAnnotationOverlay({ nodeId, children }: CanvasAnnotationOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const completedCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Contexts (ref로 유지 — React 렌더 사이클 밖)
  const completedCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const activeCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // 드로잉 상태 (ref — 드로잉 중 React 업데이트 0회)
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef<Vec2 | null>(null);
  const isLineSnappedRef = useRef(false);

  // 올가미 상태
  const lassoPathRef = useRef<Vec2[]>([]);
  const isDraggingSelectionRef = useRef(false);
  const dragStartRef = useRef<Vec2 | null>(null);

  // 공간 그리드 (지우개 히트테스트)
  const spatialGridRef = useRef(buildSpatialGrid([]));

  // 캔버스 크기
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  const store = useCanvasStore;
  const activeTool = useCanvasStore(s => s.activeTool);

  // ── 캔버스 리사이즈 ──
  const resizeCanvases = useCallback(() => {
    const container = containerRef.current;
    if (!container || !completedCanvasRef.current || !activeCanvasRef.current) return;

    const width = container.scrollWidth;
    const height = container.scrollHeight;
    canvasSizeRef.current = { width, height };

    completedCtxRef.current = setupCanvas(completedCanvasRef.current, width, height, true);
    activeCtxRef.current = setupCanvas(activeCanvasRef.current, width, height, true);

    // 완성 스트로크 리드로
    redrawCompleted();
  }, []);

  // ── 완성 스트로크 전체 리드로 ──
  const redrawCompleted = useCallback(() => {
    const ctx = completedCtxRef.current;
    if (!ctx) return;
    const { width, height } = canvasSizeRef.current;
    ctx.clearRect(0, 0, width, height);

    const strokes = store.getState().strokes;
    for (const stroke of strokes) {
      const compositeOp = stroke.tool === 'highlight' ? 'multiply' : 'source-over';
      drawFullStroke(ctx, stroke.points, stroke.width, stroke.color, stroke.opacity, compositeOp as GlobalCompositeOperation);
    }

    // 공간 그리드 재빌드
    spatialGridRef.current = buildSpatialGrid(strokes);
  }, []);

  // ── 초기화 + 리사이즈 관찰 ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    resizeCanvases();

    const observer = observeResize(container, () => {
      resizeCanvases();
    });

    return () => observer.disconnect();
  }, [resizeCanvases]);

  // ── 스토어 스트로크 변경 시 리드로 ──
  useEffect(() => {
    const unsub = store.subscribe(
      (state, prevState) => {
        if (state.strokes !== prevState.strokes) {
          redrawCompleted();
        }
      },
    );
    return unsub;
  }, [redrawCompleted]);

  // ── 데이터 로드 ──
  useEffect(() => {
    if (!nodeId) return;

    fetch(`/api/nodes/${nodeId}/annotations`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.annotations) return;
        const canvasAnn = data.annotations.find((a: any) => a.type === 'canvas');
        if (canvasAnn?.position?.strokes) {
          store.getState().loadFromAnnotation(canvasAnn.position, canvasAnn.id);
        }
      })
      .catch(() => {});
  }, [nodeId]);

  // ── 디바운스 저장 ──
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const state = store.getState();
      if (!state.isDirty) return;

      const data = state.getSerializedData();
      const body = {
        type: 'canvas',
        position: data,
        color: 'gray-3',
      };

      if (state.annotationId) {
        fetch(`/api/annotations/${state.annotationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: data }),
        }).then(() => state.markClean());
      } else {
        // 새 캔버스 어노테이션 생성
        fetch(`/api/nodes/${nodeId}/annotations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then(r => r.ok ? r.json() : null)
          .then(res => {
            if (res?.annotation?.id) {
              store.setState({ annotationId: res.annotation.id });
            }
            state.markClean();
          });
      }
    }, 2000);
  }, [nodeId]);

  // ── 포인터 이벤트 핸들러 ──

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const tool = store.getState().activeTool;
    if (!tool) return;

    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const { x, y } = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };

    if (tool === 'pen' || tool === 'freeHighlight') {
      isDrawingRef.current = true;
      currentPointsRef.current = [{
        x, y, pressure: e.pressure, time: e.timeStamp,
      }];

      // 하이라이트 꾹 누르기 감지
      if (tool === 'freeHighlight') {
        holdStartRef.current = { x, y };
        isLineSnappedRef.current = false;
        holdTimerRef.current = setTimeout(() => {
          isLineSnappedRef.current = true;
        }, 300);
      }
    } else if (tool === 'eraser') {
      isDrawingRef.current = true;
      handleErase(x, y);
    } else if (tool === 'lasso') {
      const state = store.getState();
      // 선택 영역 드래그 시작 체크
      if (state.selectedStrokeIds.size > 0) {
        isDraggingSelectionRef.current = true;
        dragStartRef.current = { x, y };
      } else {
        lassoPathRef.current = [{ x, y }];
        isDrawingRef.current = true;
      }
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const tool = store.getState().activeTool;
    if (!tool || !isDrawingRef.current && !isDraggingSelectionRef.current) return;

    e.preventDefault();

    if (tool === 'pen' || tool === 'freeHighlight') {
      const points = extractPoints(e.nativeEvent);
      const state = store.getState();

      for (const p of points) {
        let px = p.x;
        let py = p.y;

        // 하이라이트 직선 스냅
        if (tool === 'freeHighlight' && isLineSnappedRef.current && holdStartRef.current) {
          const snapped = snapToLine(holdStartRef.current, { x: px, y: py });
          px = snapped.x;
          py = snapped.y;
        }

        currentPointsRef.current.push({
          x: px, y: py, pressure: p.pressure, time: p.time,
        });
      }

      // 꾹 누르기 취소 (일정 거리 이상 이동 시)
      if (holdStartRef.current && !isLineSnappedRef.current) {
        const last = currentPointsRef.current[currentPointsRef.current.length - 1];
        const dx = last.x - holdStartRef.current.x;
        const dy = last.y - holdStartRef.current.y;
        if (dx * dx + dy * dy > 100) { // 10px
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
      }

      // 예측 포인트
      const predicted = predictNextPoint(currentPointsRef.current);
      const drawPoints = predicted
        ? [...currentPointsRef.current, predicted]
        : currentPointsRef.current;

      // 증분 드로잉
      const actx = activeCtxRef.current;
      if (actx) {
        const isPenTool = tool === 'pen';
        const color = isPenTool ? state.penColor : state.highlightColor;
        const width = isPenTool ? state.penWidth : 20;
        const opacity = isPenTool ? 1.0 : 0.3;

        if (isPenTool) {
          drawIncrementalSegment(actx, drawPoints, width, color, opacity);
        } else {
          // 하이라이트: multiply 블렌딩이 증분으로 작동하기 어려우므로 전체 리드로
          const { width: cw, height: ch } = canvasSizeRef.current;
          actx.clearRect(0, 0, cw, ch);
          drawFullStroke(actx, drawPoints, width, color, opacity, 'multiply');
        }
      }
    } else if (tool === 'eraser') {
      handleErase(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    } else if (tool === 'lasso') {
      if (isDraggingSelectionRef.current && dragStartRef.current) {
        // 선택 드래그
        const dx = e.nativeEvent.offsetX - dragStartRef.current.x;
        const dy = e.nativeEvent.offsetY - dragStartRef.current.y;
        // 드래그 프리뷰는 active canvas에 그리기
        const actx = activeCtxRef.current;
        if (actx) {
          const { width, height } = canvasSizeRef.current;
          actx.clearRect(0, 0, width, height);
          const state = store.getState();
          const selected = state.strokes.filter(s => state.selectedStrokeIds.has(s.id));
          const moved = offsetStrokes(selected, dx, dy);
          for (const s of moved) {
            drawFullStroke(actx, s.points, s.width, s.color, s.opacity);
          }
          drawSelectionBounds(actx, moved);
        }
      } else {
        // 올가미 패스 그리기
        lassoPathRef.current.push({
          x: e.nativeEvent.offsetX,
          y: e.nativeEvent.offsetY,
        });
        const actx = activeCtxRef.current;
        if (actx) {
          const { width, height } = canvasSizeRef.current;
          actx.clearRect(0, 0, width, height);
          drawLassoPath(actx, lassoPathRef.current);
        }
      }
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const tool = store.getState().activeTool;
    if (!tool) return;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if ((tool === 'pen' || tool === 'freeHighlight') && isDrawingRef.current) {
      const points = currentPointsRef.current.filter(p => !p.predicted);
      if (points.length > 0) {
        const state = store.getState();
        const isPenTool = tool === 'pen';
        const stroke: CanvasStroke = {
          id: crypto.randomUUID(),
          tool: isPenTool ? 'pen' : 'highlight',
          points,
          color: isPenTool ? state.penColor : state.highlightColor,
          width: isPenTool ? state.penWidth : 20,
          opacity: isPenTool ? 1.0 : 0.3,
          timestamp: Date.now(),
        };

        state.addStroke(stroke);
        addToGrid(spatialGridRef.current, stroke);
      }

      // Active canvas 클리어
      const actx = activeCtxRef.current;
      if (actx) {
        const { width, height } = canvasSizeRef.current;
        actx.clearRect(0, 0, width, height);
      }

      scheduleSave();
    } else if (tool === 'lasso') {
      if (isDraggingSelectionRef.current && dragStartRef.current) {
        // 드래그 완료: 스트로크 이동 적용
        const dx = e.nativeEvent.offsetX - dragStartRef.current.x;
        const dy = e.nativeEvent.offsetY - dragStartRef.current.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          const state = store.getState();
          const ids = Array.from(state.selectedStrokeIds);
          const moved = state.strokes.map(s =>
            state.selectedStrokeIds.has(s.id)
              ? { ...s, points: s.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) }
              : s
          );
          store.setState({
            strokes: moved,
            undoStack: [...state.undoStack, { type: 'move', strokeIds: ids, data: { dx, dy } }],
            redoStack: [],
            isDirty: true,
          });
        }
        isDraggingSelectionRef.current = false;
        dragStartRef.current = null;
        scheduleSave();
      } else if (lassoPathRef.current.length > 2) {
        // 올가미 선택 완료
        const contained = findContainedStrokes(
          lassoPathRef.current,
          store.getState().strokes,
        );
        store.getState().setSelectedStrokeIds(new Set(contained));
      }

      // Active canvas 클리어
      const actx = activeCtxRef.current;
      if (actx) {
        const { width, height } = canvasSizeRef.current;
        actx.clearRect(0, 0, width, height);

        // 선택 영역 표시
        const state = store.getState();
        if (state.selectedStrokeIds.size > 0) {
          const selected = state.strokes.filter(s => state.selectedStrokeIds.has(s.id));
          drawSelectionBounds(actx, selected);
        }
      }

      lassoPathRef.current = [];
    }

    isDrawingRef.current = false;
    isLineSnappedRef.current = false;
    holdStartRef.current = null;
  }, [scheduleSave]);

  // ── 지우개 처리 ──
  const handleErase = useCallback((x: number, y: number) => {
    const state = store.getState();
    if (state.eraserMode === 'stroke') {
      const hitIds = hitTestStrokes(
        x, y, state.eraserSize / 2,
        spatialGridRef.current,
        state.strokes,
      );
      if (hitIds.length > 0) {
        for (const id of hitIds) removeFromGrid(spatialGridRef.current, id);
        state.deleteStrokes(hitIds);
        scheduleSave();
      }
    } else {
      // 픽셀 지우개
      const cctx = completedCtxRef.current;
      if (cctx) {
        erasePixels(cctx, x, y, state.eraserSize / 2);
      }
    }
  }, [scheduleSave]);

  // ── 키보드 단축키 ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Cmd+Z / Ctrl+Z: undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.getState().undo();
        return;
      }
      // Cmd+Shift+Z: redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        store.getState().redo();
        return;
      }

      // 도구 입력 중이면 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'p': store.getState().setTool('pen'); break;
        case 'h': store.getState().setTool('freeHighlight'); break;
        case 'e': store.getState().setTool('eraser'); break;
        case 'l': store.getState().setTool('lasso'); break;
        case 'escape': store.getState().setTool(null); break;
        case 'delete':
        case 'backspace': {
          const state = store.getState();
          if (state.selectedStrokeIds.size > 0) {
            state.deleteStrokes(Array.from(state.selectedStrokeIds));
            scheduleSave();
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [scheduleSave]);

  const canvasActive = activeTool !== null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {children}

      {/* Completed strokes layer */}
      <canvas
        ref={completedCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Active drawing layer */}
      <canvas
        ref={activeCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: canvasActive ? 'auto' : 'none',
          zIndex: 2,
          touchAction: canvasActive ? 'none' : 'auto',
          cursor: canvasActive
            ? activeTool === 'eraser' ? 'crosshair'
            : activeTool === 'lasso' ? 'crosshair'
            : 'default'
            : 'default',
        }}
      />
    </div>
  );
}
