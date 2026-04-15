// ── 스트로크 엔진: Catmull-Rom, 압력, 예측, 증분 드로잉 ──

import type { Point, Vec2 } from '../types';

// ── 수학 유틸 ──

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Catmull-Rom 스플라인 (centripetal, alpha=0.5) ──

function catmullRomPoint(
  p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number
): Vec2 {
  // Centripetal Catmull-Rom: 커스프 방지 + 자연스러운 곡선
  const alpha = 0.5;

  const d01 = Math.pow(dist(p0, p1), alpha) || 0.001;
  const d12 = Math.pow(dist(p1, p2), alpha) || 0.001;
  const d23 = Math.pow(dist(p2, p3), alpha) || 0.001;

  const t0 = 0;
  const t1 = t0 + d01;
  const t2 = t1 + d12;
  const t3 = t2 + d23;

  const tt = lerp(t1, t2, t);

  const a1x = ((t1 - tt) / (t1 - t0)) * p0.x + ((tt - t0) / (t1 - t0)) * p1.x;
  const a1y = ((t1 - tt) / (t1 - t0)) * p0.y + ((tt - t0) / (t1 - t0)) * p1.y;
  const a2x = ((t2 - tt) / (t2 - t1)) * p1.x + ((tt - t1) / (t2 - t1)) * p2.x;
  const a2y = ((t2 - tt) / (t2 - t1)) * p1.y + ((tt - t1) / (t2 - t1)) * p2.y;
  const a3x = ((t3 - tt) / (t3 - t2)) * p2.x + ((tt - t2) / (t3 - t2)) * p3.x;
  const a3y = ((t3 - tt) / (t3 - t2)) * p2.y + ((tt - t2) / (t3 - t2)) * p3.y;

  const b1x = ((t2 - tt) / (t2 - t0)) * a1x + ((tt - t0) / (t2 - t0)) * a2x;
  const b1y = ((t2 - tt) / (t2 - t0)) * a1y + ((tt - t0) / (t2 - t0)) * a2y;
  const b2x = ((t3 - tt) / (t3 - t1)) * a2x + ((tt - t1) / (t3 - t1)) * a3x;
  const b2y = ((t3 - tt) / (t3 - t1)) * a2y + ((tt - t1) / (t3 - t1)) * a3y;

  const cx = ((t2 - tt) / (t2 - t1)) * b1x + ((tt - t1) / (t2 - t1)) * b2x;
  const cy = ((t2 - tt) / (t2 - t1)) * b1y + ((tt - t1) / (t2 - t1)) * b2y;

  return { x: cx, y: cy };
}

// ── 압력 → 굵기 ──

export function pressureToWidth(pressure: number, baseWidth: number): number {
  const p = pressure === 0 ? 0.5 : pressure; // 마우스 폴백
  return baseWidth * (0.4 + 0.8 * Math.pow(p, 0.7));
}

// ── 예측 렌더링 ──

export function predictNextPoint(points: Point[]): Point | null {
  if (points.length < 2) return null;
  const p1 = points[points.length - 2];
  const p2 = points[points.length - 1];
  const dt = p2.time - p1.time;
  if (dt <= 0 || dt > 100) return null; // 100ms 초과면 예측 안 함

  const vx = (p2.x - p1.x) / dt;
  const vy = (p2.y - p1.y) / dt;
  const PREDICT_MS = 8;

  return {
    x: p2.x + vx * PREDICT_MS,
    y: p2.y + vy * PREDICT_MS,
    pressure: p2.pressure,
    time: p2.time + PREDICT_MS,
    predicted: true,
  };
}

// ── Coalesced Events 처리 ──

export function extractPoints(e: PointerEvent): { x: number; y: number; pressure: number; time: number }[] {
  const results: { x: number; y: number; pressure: number; time: number }[] = [];

  // 브라우저가 coalescedEvents를 지원하면 중간 포인트 복원
  if (e.getCoalescedEvents) {
    const coalesced = e.getCoalescedEvents();
    for (const ce of coalesced) {
      results.push({
        x: ce.offsetX,
        y: ce.offsetY,
        pressure: ce.pressure,
        time: ce.timeStamp,
      });
    }
  }

  // 메인 이벤트 추가 (coalescedEvents에 포함 안 된 경우 대비)
  if (results.length === 0 || results[results.length - 1].time !== e.timeStamp) {
    results.push({
      x: e.offsetX,
      y: e.offsetY,
      pressure: e.pressure,
      time: e.timeStamp,
    });
  }

  return results;
}

// ── 증분 드로잉: 마지막 세그먼트만 그리기 ──

export function drawIncrementalSegment(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  baseWidth: number,
  color: string,
  opacity: number,
) {
  const len = points.length;
  if (len < 2) {
    // 단일 점: 원 하나
    if (len === 1) {
      const p = points[0];
      const w = pressureToWidth(p.pressure, baseWidth);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Catmull-Rom에 필요한 4포인트
  const i3 = len - 1;
  const i2 = Math.max(0, len - 2);
  const i1 = Math.max(0, len - 3);
  const i0 = Math.max(0, len - 4);

  const p0 = points[i0];
  const p1 = points[i1];
  const p2 = points[i2];
  const p3 = points[i3];

  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // p2→p3 세그먼트를 Catmull-Rom으로 보간
  const steps = Math.max(4, Math.ceil(dist(p2, p3) / 2));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const pt = catmullRomPoint(p0, p1, p2, p3, t);
    const pressure = lerp(p2.pressure, p3.pressure, t);
    const w = pressureToWidth(pressure, baseWidth);

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, w / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── 전체 스트로크 리드로 (undo/래스터화용) ──

export function drawFullStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  baseWidth: number,
  color: string,
  opacity: number,
  compositeOp: GlobalCompositeOperation = 'source-over',
) {
  if (points.length === 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = compositeOp;
  ctx.fillStyle = color;

  if (points.length === 1) {
    const p = points[0];
    const w = pressureToWidth(p.pressure, baseWidth);
    ctx.beginPath();
    ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (points.length === 2) {
    // 직선
    const [p0, p1] = points;
    const w0 = pressureToWidth(p0.pressure, baseWidth);
    const w1 = pressureToWidth(p1.pressure, baseWidth);
    const steps = Math.max(4, Math.ceil(dist(p0, p1) / 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = lerp(p0.x, p1.x, t);
      const y = lerp(p0.y, p1.y, t);
      const w = lerp(w0, w1, t);
      ctx.beginPath();
      ctx.arc(x, y, w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // 3+ 포인트: Catmull-Rom
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const segLen = dist(p1, p2);
    const steps = Math.max(2, Math.ceil(segLen / 2));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const pt = catmullRomPoint(p0, p1, p2, p3, t);
      const pressure = lerp(p1.pressure, p2.pressure, t);
      const w = pressureToWidth(pressure, baseWidth);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── 하이라이트 직선 스냅 ──

export function snapToLine(
  startPoint: Vec2,
  currentPoint: Vec2,
): Vec2 {
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  const rawAngle = Math.atan2(dy, dx);
  // 45도 단위 스냅
  const snapAngle = Math.round(rawAngle / (Math.PI / 4)) * (Math.PI / 4);
  const distance = dist(startPoint, currentPoint);

  return {
    x: startPoint.x + Math.cos(snapAngle) * distance,
    y: startPoint.y + Math.sin(snapAngle) * distance,
  };
}
