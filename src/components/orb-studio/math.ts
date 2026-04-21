// Orb Studio — Rect 수학 유틸

import type { Rect } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/** 두 Rect가 겹치는지 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Rect가 포인트를 포함하는지 */
export function rectContainsPoint(rect: Rect, px: number, py: number): boolean {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

/** 여러 Rect의 바운딩 박스 */
export function boundingRect(rects: Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 마키 좌표를 정규화 (음수 width/height 허용 → 정규화) */
export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

/** 두 값의 거리 */
export function dist1d(a: number, b: number): number {
  return Math.abs(a - b);
}

/** screen 좌표 → canvas 좌표 변환 */
export function screenToCanvas(
  sx: number,
  sy: number,
  vpX: number,
  vpY: number,
  zoom: number,
): { x: number; y: number } {
  return {
    x: (sx - vpX) / zoom,
    y: (sy - vpY) / zoom,
  };
}

/** canvas 좌표 → screen 좌표 변환 */
export function canvasToScreen(
  cx: number,
  cy: number,
  vpX: number,
  vpY: number,
  zoom: number,
): { x: number; y: number } {
  return {
    x: cx * zoom + vpX,
    y: cy * zoom + vpY,
  };
}
