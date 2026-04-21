'use client';

import { useEffect, useCallback, RefObject } from 'react';
import { useStudioStore } from '../studioStore';

export function useViewport(canvasRef: RefObject<HTMLDivElement | null>) {
  const { pan, zoom } = useStudioStore();

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;

    // ctrlKey = 핀치 제스처 또는 Ctrl+휠 → 줌
    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      zoom(factor, centerX, centerY);
    } else {
      // 일반 스크롤 → 팬
      pan(-e.deltaX, -e.deltaY);
    }
  }, [pan, zoom, canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel, canvasRef]);
}
