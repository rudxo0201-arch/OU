// ── Canvas 유틸: DPI, 리사이즈, 좌표 변환 ──

/** DPI 인식 캔버스 초기화 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  desynchronized = true,
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d', {
    desynchronized,
    alpha: true,
    willReadFrequently: false,
  })!;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** ResizeObserver 기반 캔버스 리사이즈 */
export function observeResize(
  target: HTMLElement,
  onResize: (width: number, height: number) => void,
): ResizeObserver {
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      onResize(width, height);
    }
  });
  observer.observe(target);
  return observer;
}

/** 포인터 이벤트 → 캔버스 로컬 좌표 */
export function pointerToLocal(
  e: PointerEvent | { offsetX: number; offsetY: number },
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  // offsetX/offsetY는 이미 캔버스 기준 좌표
  return { x: e.offsetX, y: e.offsetY };
}

/** 바운딩 박스 계산 */
export function getBounds(points: { x: number; y: number }[]): {
  minX: number; minY: number; maxX: number; maxY: number;
  width: number; height: number;
} {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
