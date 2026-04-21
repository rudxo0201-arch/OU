'use client';

import type { StudioElement, Guide } from '../types';
import { dist1d } from '../math';

const SNAP_THRESHOLD = 6; // px (canvas 좌표)

interface SnapResult {
  x: number;
  y: number;
  guides: Guide[];
}

/**
 * 드래그/리사이즈 중 다른 요소와의 정렬 감지
 * @param movingRect  현재 이동 중인 요소의 Rect
 * @param others      다른 요소들
 * @returns           스냅이 적용된 x/y와 가이드 라인들
 */
export function calcSmartGuides(
  movingRect: { x: number; y: number; width: number; height: number },
  others: StudioElement[],
  zoom: number,
): SnapResult {
  const threshold = SNAP_THRESHOLD / zoom;
  const guides: Guide[] = [];

  let { x, y } = movingRect;
  const w = movingRect.width;
  const h = movingRect.height;

  // 현재 요소의 비교 포인트 (left, center, right / top, center, bottom)
  const mL = x, mCX = x + w / 2, mR = x + w;
  const mT = y, mCY = y + h / 2, mB = y + h;

  let bestDX = threshold + 1;
  let bestDY = threshold + 1;
  let snapX: number | null = null;
  let snapY: number | null = null;
  const xGuides: Guide[] = [];
  const yGuides: Guide[] = [];

  for (const el of others) {
    const oL = el.x, oCX = el.x + el.width / 2, oR = el.x + el.width;
    const oT = el.y, oCY = el.y + el.height / 2, oB = el.y + el.height;

    // X축 스냅: 현재 요소의 각 edge vs 다른 요소의 각 edge
    const xPairs: Array<[number, number]> = [
      [mL, oL], [mL, oR], [mL, oCX],
      [mCX, oL], [mCX, oR], [mCX, oCX],
      [mR, oL], [mR, oR], [mR, oCX],
    ];

    for (const [mine, theirs] of xPairs) {
      const d = dist1d(mine, theirs);
      if (d < bestDX) {
        bestDX = d;
        snapX = theirs - (mine - x);
        xGuides.length = 0;
        xGuides.push({ axis: 'x', value: theirs });
      } else if (d === bestDX && snapX !== null) {
        xGuides.push({ axis: 'x', value: theirs });
      }
    }

    // Y축 스냅
    const yPairs: Array<[number, number]> = [
      [mT, oT], [mT, oB], [mT, oCY],
      [mCY, oT], [mCY, oB], [mCY, oCY],
      [mB, oT], [mB, oB], [mB, oCY],
    ];

    for (const [mine, theirs] of yPairs) {
      const d = dist1d(mine, theirs);
      if (d < bestDY) {
        bestDY = d;
        snapY = theirs - (mine - y);
        yGuides.length = 0;
        yGuides.push({ axis: 'y', value: theirs });
      } else if (d === bestDY && snapY !== null) {
        yGuides.push({ axis: 'y', value: theirs });
      }
    }
  }

  if (bestDX <= threshold && snapX !== null) {
    x = snapX;
    guides.push(...xGuides);
  }
  if (bestDY <= threshold && snapY !== null) {
    y = snapY;
    guides.push(...yGuides);
  }

  return { x, y, guides };
}
