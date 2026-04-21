'use client';

import type { ResizeHandle, Rect } from '../types';
import { clamp } from '../math';

interface ResizeOptions {
  handle: ResizeHandle;
  initialRect: Rect;
  delta: { dx: number; dy: number };  // canvas 좌표 델타
  shift: boolean;   // 비율 유지
  alt: boolean;     // 중심 기준
  minWidth: number;
  minHeight: number;
}

export function calcResize({
  handle,
  initialRect,
  delta,
  shift,
  alt,
  minWidth,
  minHeight,
}: ResizeOptions): Rect {
  let { x, y, width, height } = initialRect;
  const { dx, dy } = delta;

  // 어떤 edge가 움직이는지
  const movesN = handle === 'n' || handle === 'ne' || handle === 'nw';
  const movesS = handle === 's' || handle === 'se' || handle === 'sw';
  const movesE = handle === 'e' || handle === 'ne' || handle === 'se';
  const movesW = handle === 'w' || handle === 'nw' || handle === 'sw';

  let top    = initialRect.y;
  let bottom = initialRect.y + initialRect.height;
  let left   = initialRect.x;
  let right  = initialRect.x + initialRect.width;

  // Alt: 중심 기준 → 반대 edge도 같은 양 반대 방향으로 이동
  if (alt) {
    if (movesN) { top += dy; bottom -= dy; }
    if (movesS) { bottom += dy; top -= dy; }
    if (movesE) { right += dx; left -= dx; }
    if (movesW) { left += dx; right -= dx; }
  } else {
    if (movesN) top += dy;
    if (movesS) bottom += dy;
    if (movesE) right += dx;
    if (movesW) left += dx;
  }

  let newWidth  = right - left;
  let newHeight = bottom - top;

  // 최소 크기 강제
  if (newWidth < minWidth) {
    if (movesW) left = right - minWidth;
    else right = left + minWidth;
    newWidth = minWidth;
  }
  if (newHeight < minHeight) {
    if (movesN) top = bottom - minHeight;
    else bottom = top + minHeight;
    newHeight = minHeight;
  }

  // Shift: 비율 유지
  if (shift && initialRect.width > 0 && initialRect.height > 0) {
    const ratio = initialRect.width / initialRect.height;
    const isCorner = (movesN || movesS) && (movesE || movesW);

    if (isCorner) {
      // 코너: 큰 델타 기준으로 비율 맞춤
      const absDX = Math.abs(newWidth - initialRect.width);
      const absDY = Math.abs(newHeight - initialRect.height);

      if (absDX >= absDY) {
        newHeight = newWidth / ratio;
      } else {
        newWidth = newHeight * ratio;
      }
    } else if (movesE || movesW) {
      newHeight = newWidth / ratio;
    } else {
      newWidth = newHeight * ratio;
    }

    // 비율 조정 후 edge 재계산
    if (movesN) top = bottom - newHeight;
    else bottom = top + newHeight;
    if (movesW) left = right - newWidth;
    else right = left + newWidth;
  }

  return {
    x: left,
    y: top,
    width: clamp(right - left, minWidth, Infinity),
    height: clamp(bottom - top, minHeight, Infinity),
  };
}
