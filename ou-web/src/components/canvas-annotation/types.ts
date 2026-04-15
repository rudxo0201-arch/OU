// ── 캔버스 어노테이션 타입 ──

export type CanvasTool = 'pen' | 'freeHighlight' | 'eraser' | 'lasso';
export type EraserMode = 'stroke' | 'pixel';
export type HighlightMode = 'free' | 'text';

export interface Point {
  x: number;
  y: number;
  pressure: number;
  time: number;
  predicted?: boolean;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface CanvasStroke {
  id: string;
  tool: 'pen' | 'highlight';
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  timestamp: number;
}

export interface SerializedStroke {
  id: string;
  tool: 'pen' | 'highlight';
  points: [number, number, number][]; // [x, y, pressure]
  color: string;
  width: number;
  opacity: number;
}

export interface CanvasAnnotationData {
  version: 1;
  strokes: SerializedStroke[];
  viewport: { width: number; scrollHeight: number };
}

export interface CanvasAction {
  type: 'add' | 'delete' | 'move';
  strokeIds: string[];
  data?: any; // move delta, previous state 등
}

// ── 직렬화 유틸 ──

export function serializeStroke(stroke: CanvasStroke): SerializedStroke {
  return {
    id: stroke.id,
    tool: stroke.tool,
    points: stroke.points
      .filter(p => !p.predicted)
      .map(p => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, Math.round(p.pressure * 100) / 100]),
    color: stroke.color,
    width: stroke.width,
    opacity: stroke.opacity,
  };
}

export function deserializeStroke(s: SerializedStroke): CanvasStroke {
  return {
    id: s.id,
    tool: s.tool,
    points: s.points.map(([x, y, p]) => ({ x, y, pressure: p, time: 0 })),
    color: s.color,
    width: s.width,
    opacity: s.opacity,
    timestamp: 0,
  };
}
