// Orb Studio — 타입 정의

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface StudioElement {
  id: string;
  type: string;          // 위젯 레지스트리 키
  x: number;             // canvas px
  y: number;             // canvas px
  width: number;         // px
  height: number;        // px
  minWidth: number;
  minHeight: number;
  aspectRatio?: number;  // width/height — lock 시 사용
  zIndex: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  x: number;   // pan offset px
  y: number;
  zoom: number; // 0.1 ~ 3.0
}

export type InteractionKind = 'drag' | 'resize' | 'marquee' | 'pan';

export interface DragInteraction {
  kind: 'drag';
  startPointer: { x: number; y: number }; // canvas 좌표
  startRects: Map<string, Rect>;           // 각 선택 요소의 시작 Rect
}

export interface ResizeInteraction {
  kind: 'resize';
  elementId: string;
  handle: ResizeHandle;
  startPointer: { x: number; y: number }; // canvas 좌표
  startRect: Rect;
}

export interface MarqueeInteraction {
  kind: 'marquee';
  startPointer: { x: number; y: number }; // canvas 좌표
  currentPointer: { x: number; y: number };
}

export interface PanInteraction {
  kind: 'pan';
  startPointer: { x: number; y: number }; // screen 좌표
  startViewport: { x: number; y: number };
}

export type Interaction =
  | DragInteraction
  | ResizeInteraction
  | MarqueeInteraction
  | PanInteraction;

export type GuideAxis = 'x' | 'y';

export interface Guide {
  axis: GuideAxis;
  value: number;   // canvas 좌표 기준
}

// CanvasSnapshot: undo/redo용
export interface CanvasSnapshot {
  elements: StudioElement[];
}
