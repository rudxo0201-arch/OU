// ── 올가미 엔진: 패스 포함 판정 ──

import type { Vec2, CanvasStroke } from '../types';
import { getBounds } from './canvas-utils';

/** Ray-casting 알고리즘: 점이 다각형 안에 있는지 */
function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  const { x, y } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect =
      ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/** 올가미 패스 안에 포함된 스트로크 ID 반환 */
export function findContainedStrokes(
  lassoPath: Vec2[],
  strokes: CanvasStroke[],
  threshold = 0.5, // 포인트의 50% 이상이 올가미 안에 있으면 선택
): string[] {
  if (lassoPath.length < 3) return [];

  const lassoBounds = getBounds(lassoPath);
  const selectedIds: string[] = [];

  for (const stroke of strokes) {
    // 바운딩 박스 빠른 거부
    const strokeBounds = getBounds(stroke.points);
    if (
      strokeBounds.maxX < lassoBounds.minX ||
      strokeBounds.minX > lassoBounds.maxX ||
      strokeBounds.maxY < lassoBounds.minY ||
      strokeBounds.minY > lassoBounds.maxY
    ) {
      continue;
    }

    // 포인트별 포함 판정
    const realPoints = stroke.points.filter(p => !p.predicted);
    if (realPoints.length === 0) continue;

    let insideCount = 0;
    for (const p of realPoints) {
      if (pointInPolygon(p, lassoPath)) insideCount++;
    }

    if (insideCount / realPoints.length >= threshold) {
      selectedIds.push(stroke.id);
    }
  }

  return selectedIds;
}

/** 올가미 패스 그리기 (점선) */
export function drawLassoPath(
  ctx: CanvasRenderingContext2D,
  path: Vec2[],
  closed = false,
) {
  if (path.length < 2) return;

  ctx.save();
  ctx.strokeStyle = 'var(--mantine-color-gray-5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.globalAlpha = 0.8;

  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  if (closed) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** 선택 영역 바운딩 박스 그리기 */
export function drawSelectionBounds(
  ctx: CanvasRenderingContext2D,
  strokes: CanvasStroke[],
  padding = 8,
) {
  if (strokes.length === 0) return;

  const allPoints = strokes.flatMap(s => s.points.filter(p => !p.predicted));
  const bounds = getBounds(allPoints);

  ctx.save();
  ctx.strokeStyle = 'var(--mantine-color-gray-5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.globalAlpha = 0.6;

  ctx.strokeRect(
    bounds.minX - padding,
    bounds.minY - padding,
    bounds.width + padding * 2,
    bounds.height + padding * 2,
  );
  ctx.restore();
}

/** 스트로크 포인트 오프셋 이동 */
export function offsetStrokes(
  strokes: CanvasStroke[],
  dx: number,
  dy: number,
): CanvasStroke[] {
  return strokes.map(s => ({
    ...s,
    points: s.points.map(p => ({
      ...p,
      x: p.x + dx,
      y: p.y + dy,
    })),
  }));
}
