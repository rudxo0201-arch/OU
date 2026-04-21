// Orb Studio — StudioElement ↔ WidgetInstance 변환

import type { StudioElement } from './types';
import type { WidgetInstance } from '@/components/widgets/types';
import { getWidgetDef } from '@/components/widgets/registry';

/**
 * WidgetInstance[] (그리드 단위) → StudioElement[] (픽셀 단위)
 * @param canvasWidth  캔버스 픽셀 너비
 * @param canvasHeight 캔버스 픽셀 높이
 * @param gridCols     그리드 컬럼 수
 * @param gridRows     그리드 행 수
 */
export function fromWidgetInstances(
  widgets: WidgetInstance[],
  canvasWidth: number,
  canvasHeight: number,
  gridCols: number,
  gridRows: number,
): StudioElement[] {
  const cellW = canvasWidth / gridCols;
  const cellH = canvasHeight / gridRows;

  return widgets.map((w, i) => {
    const def = getWidgetDef(w.type);
    return {
      id: w.id,
      type: w.type,
      x: w.x * cellW,
      y: w.y * cellH,
      width: w.w * cellW,
      height: w.h * cellH,
      minWidth: (def?.minSize[0] ?? 1) * cellW,
      minHeight: (def?.minSize[1] ?? 1) * cellH,
      zIndex: i,
    };
  });
}

/**
 * StudioElement[] (픽셀 단위) → WidgetInstance[] (그리드 단위)
 */
export function toWidgetInstances(
  elements: StudioElement[],
  canvasWidth: number,
  canvasHeight: number,
  gridCols: number,
  gridRows: number,
): WidgetInstance[] {
  const cellW = canvasWidth / gridCols;
  const cellH = canvasHeight / gridRows;

  return elements.map(el => ({
    id: el.id,
    type: el.type,
    x: Math.round(el.x / cellW),
    y: Math.round(el.y / cellH),
    w: Math.max(1, Math.round(el.width / cellW)),
    h: Math.max(1, Math.round(el.height / cellH)),
  }));
}
