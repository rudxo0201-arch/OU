// ── 지우개 엔진: 공간 그리드 히트테스트 + 픽셀 지우개 ──

import type { CanvasStroke, Point } from '../types';

// ── 공간 그리드 (스트로크 단위 지우개용) ──

interface SpatialGrid {
  cellSize: number;
  cells: Map<string, Set<string>>; // "col,row" → Set<strokeId>
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function buildSpatialGrid(strokes: CanvasStroke[], cellSize = 40): SpatialGrid {
  const grid: SpatialGrid = { cellSize, cells: new Map() };

  for (const stroke of strokes) {
    for (const p of stroke.points) {
      if (p.predicted) continue;
      const col = Math.floor(p.x / cellSize);
      const row = Math.floor(p.y / cellSize);
      const key = cellKey(col, row);
      let cell = grid.cells.get(key);
      if (!cell) {
        cell = new Set();
        grid.cells.set(key, cell);
      }
      cell.add(stroke.id);
    }
  }

  return grid;
}

/** 지우개 위치에서 히트되는 스트로크 ID 반환 */
export function hitTestStrokes(
  x: number,
  y: number,
  eraserRadius: number,
  grid: SpatialGrid,
  strokes: CanvasStroke[],
): string[] {
  const hitIds: string[] = [];
  const { cellSize, cells } = grid;

  // 지우개 반경 내 셀들 조회
  const minCol = Math.floor((x - eraserRadius) / cellSize);
  const maxCol = Math.floor((x + eraserRadius) / cellSize);
  const minRow = Math.floor((y - eraserRadius) / cellSize);
  const maxRow = Math.floor((y + eraserRadius) / cellSize);

  const candidateIds = new Set<string>();
  for (let col = minCol; col <= maxCol; col++) {
    for (let row = minRow; row <= maxRow; row++) {
      const cell = cells.get(cellKey(col, row));
      if (cell) {
        cell.forEach(id => candidateIds.add(id));
      }
    }
  }

  // 후보 스트로크에 대해 정밀 히트테스트
  const r2 = eraserRadius * eraserRadius;
  const strokeMap = new Map(strokes.map(s => [s.id, s]));

  for (const id of Array.from(candidateIds)) {
    const stroke = strokeMap.get(id);
    if (!stroke) continue;

    for (const p of stroke.points) {
      if (p.predicted) continue;
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy <= r2) {
        hitIds.push(id);
        break; // 한 점이라도 히트면 충분
      }
    }
  }

  return hitIds;
}

/** 공간 그리드에서 스트로크 제거 */
export function removeFromGrid(grid: SpatialGrid, strokeId: string) {
  Array.from(grid.cells.values()).forEach(cell => {
    cell.delete(strokeId);
  });
}

/** 공간 그리드에 스트로크 추가 */
export function addToGrid(grid: SpatialGrid, stroke: CanvasStroke) {
  const { cellSize, cells } = grid;
  for (const p of stroke.points) {
    if (p.predicted) continue;
    const col = Math.floor(p.x / cellSize);
    const row = Math.floor(p.y / cellSize);
    const key = cellKey(col, row);
    let cell = cells.get(key);
    if (!cell) {
      cell = new Set();
      cells.set(key, cell);
    }
    cell.add(stroke.id);
  }
}

// ── 픽셀 지우개 ──

/** 픽셀 단위 지우기 (destination-out composition) */
export function erasePixels(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
