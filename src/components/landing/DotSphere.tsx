'use client';

import { useEffect, useRef } from 'react';

export function DotSphere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    if (!containerRef.current) return;
    destroyedRef.current = false;
    let animId: number;
    let app: any;

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
        active: true,
      };
    };
    const onMouseLeave = () => { mouseRef.current.active = false; };

    const init = async () => {
      const PIXI = await import('pixi.js');
      if (destroyedRef.current || !containerRef.current) return;

      app = new PIXI.Application();
      const container = containerRef.current;
      const w = container.clientWidth;
      const h = container.clientHeight;

      try {
        await app.init({ width: w, height: h, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio, 2), autoDensity: true });
      } catch (e) { console.error('[DotSphere] PixiJS init failed:', e); return; }
      if (destroyedRef.current) { app.destroy(true); return; }
      container.appendChild(app.canvas);

      const NUM_POINTS = window.innerWidth < 768 ? 600 : 1000;
      const RADIUS = Math.min(w, h) * 0.38;
      const CENTER_X = w * 0.5;
      const CENTER_Y = h * 0.5;
      const PERSPECTIVE = 800;

      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const points: { baseX: number; baseY: number; baseZ: number }[] = [];
      for (let i = 0; i < NUM_POINTS; i++) {
        const y = 1 - (i / (NUM_POINTS - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        points.push({ baseX: Math.cos(theta) * r * RADIUS, baseY: y * RADIUS, baseZ: Math.sin(theta) * r * RADIUS });
      }

      const gfx = new PIXI.Graphics();
      app.stage.addChild(gfx);
      let autoRotY = 0;
      let targetRotX = 0, targetRotY = 0, currentRotX = 0, currentRotY = 0;
      let frameCount = 0;

      const animate = () => {
        if (destroyedRef.current) return;
        frameCount++;
        autoRotY += 0.002;

        if (mouseRef.current.active) {
          targetRotY = mouseRef.current.x * 0.5;
          targetRotX = mouseRef.current.y * 0.3;
        } else {
          targetRotY = 0;
          targetRotX = 0;
        }
        currentRotX += (targetRotX - currentRotX) * 0.05;
        currentRotY += (targetRotY - currentRotY) * 0.05;

        const rotY = autoRotY + currentRotY;
        const rotX = currentRotX;
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        gfx.clear();

        const projected: { sx: number; sy: number; z: number; size: number; alpha: number }[] = [];
        for (let i = 0; i < NUM_POINTS; i++) {
          const p = points[i];
          const x1 = p.baseX * cosY + p.baseZ * sinY;
          const z1 = -p.baseX * sinY + p.baseZ * cosY;
          const y2 = p.baseY * cosX - z1 * sinX;
          const z2 = p.baseY * sinX + z1 * cosX;
          const scale = PERSPECTIVE / (PERSPECTIVE + z2);
          const sx = CENTER_X + x1 * scale;
          const sy = CENTER_Y + y2 * scale;
          const nz = (z2 + RADIUS) / (2 * RADIUS);
          const dotSize = 0.8 + nz * 2.5;
          let alpha = 0.15 + nz * 0.65;
          if (nz > 0.6) alpha += Math.sin(frameCount * 0.02 + i * 0.1) * 0.15 * nz;
          projected.push({ sx, sy, z: z2, size: dotSize, alpha: Math.max(0.05, Math.min(1, alpha)) });
        }
        projected.sort((a, b) => a.z - b.z);
        for (const p of projected) {
          gfx.circle(p.sx, p.sy, p.size);
          gfx.fill({ color: 0xaaaaaa, alpha: p.alpha });
        }
        animId = requestAnimationFrame(animate);
      };
      animId = requestAnimationFrame(animate);

      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('mouseleave', onMouseLeave);

      const onResize = () => {
        if (!container || destroyedRef.current) return;
        app.renderer.resize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener('resize', onResize);

      (containerRef as any)._cleanup = () => {
        window.removeEventListener('resize', onResize);
        container.removeEventListener('mousemove', onMouseMove);
        container.removeEventListener('mouseleave', onMouseLeave);
        cancelAnimationFrame(animId);
        app.destroy(true);
      };
    };

    init();
    return () => { destroyedRef.current = true; if ((containerRef as any)._cleanup) (containerRef as any)._cleanup(); };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
