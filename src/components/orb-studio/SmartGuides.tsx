'use client';

import type { Guide } from './types';

interface Props {
  guides: Guide[];
  canvasWidth: number;
  canvasHeight: number;
  viewport: { x: number; y: number; zoom: number };
}

export function SmartGuides({ guides, canvasWidth, canvasHeight, viewport }: Props) {
  if (guides.length === 0) return null;

  // canvas 좌표 → screen 좌표
  function toScreen(canvasVal: number, axis: 'x' | 'y'): number {
    return axis === 'x'
      ? canvasVal * viewport.zoom + viewport.x
      : canvasVal * viewport.zoom + viewport.y;
  }

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'visible',
      }}
    >
      {guides.map((g, i) => {
        if (g.axis === 'x') {
          const screenX = toScreen(g.value, 'x');
          return (
            <line
              key={i}
              x1={screenX}
              y1={0}
              x2={screenX}
              y2={canvasHeight}
              stroke="var(--ou-accent, #888)"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.8}
            />
          );
        } else {
          const screenY = toScreen(g.value, 'y');
          return (
            <line
              key={i}
              x1={0}
              y1={screenY}
              x2={canvasWidth}
              y2={screenY}
              stroke="var(--ou-accent, #888)"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.8}
            />
          );
        }
      })}
    </svg>
  );
}
