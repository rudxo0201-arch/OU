'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { PencilSimple, Eraser, ArrowCounterClockwise, X } from '@phosphor-icons/react';
import type { BlockRect } from './useBlockPositionMap';

export type Stroke = {
  id: string;
  points: [number, number][];
  color: string;
  width: number;
  // 공간 관계 — 스트로크가 닿은 블록들
  relatedBlocks: { blockId: string; nodeId?: string; domain?: string }[];
};

type Tool = 'pen' | 'eraser';

type Props = {
  active: boolean;          // 필기 모드 on/off (그리기 가능)
  visible: boolean;         // 필기 표시 여부 (active가 아닐 때도 strokes 렌더)
  strokes: Stroke[];
  onStrokeAdd: (stroke: Stroke) => void;
  onStrokeRemove: (id: string) => void;
  findBlockAt: (x: number, y: number) => BlockRect | null;
  buildBlockMap: () => BlockRect[];
};

const COLORS = [
  'var(--ou-text-body)',
  'var(--ou-accent)',
  '#e03131',
  '#2f9e44',
  '#1971c2',
];

export function AnnotationLayer({
  active, visible, strokes, onStrokeAdd, onStrokeRemove, findBlockAt, buildBlockMap,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<[number, number][]>([]);
  const touchedBlocksRef = useRef<Map<string, BlockRect>>(new Map());

  const [tool, setTool]   = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(2);

  // 캔버스 리사이즈
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = document.body.scrollHeight;
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 전체 다시 그리기
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
  }, [strokes]);

  useEffect(() => { redraw(); }, [redraw]);

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth   = stroke.width;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
    }
    ctx.stroke();
  }

  const getPos = (e: React.PointerEvent): [number, number] => {
    return [e.clientX, e.clientY + window.scrollY];
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!active) return;
    e.preventDefault();
    drawingRef.current = true;
    currentStrokeRef.current = [getPos(e)];
    touchedBlocksRef.current = new Map();
    buildBlockMap(); // 좌표맵 최신화

    // 첫 점에서 블록 감지
    const block = findBlockAt(e.clientX, e.clientY);
    if (block) touchedBlocksRef.current.set(block.blockId, block);
  }, [active, buildBlockMap, findBlockAt]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!active || !drawingRef.current) return;
    const pt = getPos(e);
    currentStrokeRef.current.push(pt);

    // 블록 감지
    const block = findBlockAt(e.clientX, e.clientY);
    if (block && !touchedBlocksRef.current.has(block.blockId)) {
      touchedBlocksRef.current.set(block.blockId, block);
    }

    // 실시간 그리기
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const pts = currentStrokeRef.current;
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1]);
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.stroke();
  }, [active, color, width, findBlockAt]);

  const handlePointerUp = useCallback(() => {
    if (!active || !drawingRef.current) return;
    drawingRef.current = false;

    const pts = currentStrokeRef.current;
    if (pts.length < 2) return;

    const relatedBlocks = Array.from(touchedBlocksRef.current.values()).map((b) => ({
      blockId: b.blockId,
      nodeId:  b.nodeId,
      domain:  b.domain,
    }));

    const stroke: Stroke = {
      id: crypto.randomUUID(),
      points: pts,
      color,
      width,
      relatedBlocks,
    };

    onStrokeAdd(stroke);
    currentStrokeRef.current = [];
    touchedBlocksRef.current = new Map();
  }, [active, color, width, onStrokeAdd]);

  return (
    <>
      {/* 캔버스 오버레이 */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 50,
          pointerEvents: active ? 'all' : 'none',
          touchAction: active ? 'none' : 'auto',
          cursor: active ? (tool === 'pen' ? 'crosshair' : 'cell') : 'default',
          opacity: (active || visible) ? 1 : 0,
        }}
      />

      {/* 필기 도구 툴바 — 활성화 시에만 표시 */}
      {active && (
        <div
          style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 51,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--ou-bg)',
            borderRadius: 'var(--ou-radius-pill)',
            boxShadow: 'var(--ou-neu-raised-md)',
            padding: '6px 12px',
          }}
        >
          {/* 펜 */}
          <ToolBtn
            icon={<PencilSimple size={15} />}
            active={tool === 'pen'}
            onClick={() => setTool('pen')}
            title="펜"
          />
          {/* 지우개 */}
          <ToolBtn
            icon={<Eraser size={15} />}
            active={tool === 'eraser'}
            onClick={() => setTool('eraser')}
            title="지우개"
          />

          <div style={{ width: 1, height: 20, background: 'var(--ou-border-subtle)', margin: '0 4px' }} />

          {/* 색상 */}
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('pen'); }}
              title={c}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: color === c ? '2px solid var(--ou-text-body)' : '1px solid transparent',
                background: c.startsWith('var') ? 'currentColor' : c,
                color: c,
                cursor: 'pointer',
                padding: 0,
                outline: 'none',
              }}
            />
          ))}

          <div style={{ width: 1, height: 20, background: 'var(--ou-border-subtle)', margin: '0 4px' }} />

          {/* 굵기 */}
          {[1, 2, 4].map((w) => (
            <button
              key={w}
              onClick={() => setWidth(w)}
              title={`굵기 ${w}`}
              style={{
                width: 24,
                height: 24,
                border: 'none',
                borderRadius: 'var(--ou-radius-sm)',
                background: width === w ? 'var(--ou-surface-muted)' : 'transparent',
                boxShadow: width === w ? 'var(--ou-neu-pressed-sm)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 12, height: w, borderRadius: 99, background: 'var(--ou-text-body)' }} />
            </button>
          ))}

          <div style={{ width: 1, height: 20, background: 'var(--ou-border-subtle)', margin: '0 4px' }} />

          {/* 전체 지우기 */}
          <ToolBtn
            icon={<ArrowCounterClockwise size={15} />}
            active={false}
            onClick={() => strokes.forEach((s) => onStrokeRemove(s.id))}
            title="전체 지우기"
          />
        </div>
      )}
    </>
  );
}

function ToolBtn({ icon, active, onClick, title }: { icon: React.ReactNode; active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        border: 'none',
        borderRadius: 'var(--ou-radius-sm)',
        background: active ? 'var(--ou-surface-muted)' : 'transparent',
        boxShadow: active ? 'var(--ou-neu-pressed-sm)' : 'none',
        cursor: 'pointer',
        color: active ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
        transition: 'all var(--ou-transition)',
      }}
    >
      {icon}
    </button>
  );
}
