'use client';

import { snapToGrid } from '../math';

export function applyGridSnap(
  x: number,
  y: number,
  width: number,
  height: number,
  gridSize: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
    width: snapToGrid(width, gridSize),
    height: snapToGrid(height, gridSize),
  };
}
