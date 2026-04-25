'use client';

import { useRef, useEffect, useCallback } from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

function createSpherePoints(count: number, radius: number): Point3D[] {
  const points: Point3D[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push({
      x: Math.cos(theta) * radiusAtY * radius,
      y: y * radius,
      z: Math.sin(theta) * radiusAtY * radius,
    });
  }
  return points;
}

function rotateY(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.z * sin, y: p.y, z: p.x * sin + p.z * cos };
}

function rotateX(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}

export function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point3D[]>([]);
  const rotationRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(0);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const animRef = useRef<number>(0);

  const init = useCallback(() => {
    pointsRef.current = createSpherePoints(1200, 1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    init();

    let dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      // ctx.scale은 draw 루프에서 setTransform으로 매 프레임 처리
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouseDown = (e: MouseEvent) => {
      dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x += dy * 0.005;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };
    const handleMouseUp = () => { dragRef.current.active = false; };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const isDark = () => document.documentElement.dataset.theme !== 'light';

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const dark = isDark();

      // DPR 적용 — setTransform으로 매 프레임 리셋 (누적 방지)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (!dragRef.current.active) autoRotateRef.current += 0.003;

      const totalRotY = rotationRef.current.y + autoRotateRef.current;
      const totalRotX = rotationRef.current.x;

      const isMobile = window.innerWidth < 768;
      const cx = w / 2;
      const cy = isMobile ? h * 0.6 : h * 0.48;
      const sphereRadius = Math.min(w, h) * 0.42;
      const perspective = 1200;

      const projected: { x: number; y: number; z: number; size: number; alpha: number }[] = [];

      for (const p of pointsRef.current) {
        let rp = rotateY(p, totalRotY);
        rp = rotateX(rp, totalRotX);
        const scale = perspective / (perspective + rp.z * sphereRadius);
        const sx = cx + rp.x * sphereRadius * scale;
        const sy = cy + rp.y * sphereRadius * scale;
        const depthNorm = (rp.z + 1) / 2;
        const alpha = 0.1 + depthNorm * 0.7;
        const size = 0.5 + depthNorm * 1.8;
        projected.push({ x: sx, y: sy, z: rp.z, size, alpha });
      }

      projected.sort((a, b) => a.z - b.z);

      const dotColor = dark ? '255, 255, 255' : '0, 0, 0';
      for (const pt of projected) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dotColor}, ${pt.alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
    />
  );
}
