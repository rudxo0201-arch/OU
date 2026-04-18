'use client';

import { useEffect, useRef } from 'react';

const NODE_COUNT = 15000;
const EDGE_COUNT = 25000;

export function MassGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    destroyedRef.current = false;

    const init = async () => {
      const PIXI = await import('pixi.js');
      if (destroyedRef.current || !containerRef.current) return;

      const el = containerRef.current;
      const w = el.clientWidth;
      const h = el.clientHeight;

      const app = new PIXI.Application();
      await app.init({
        width: w, height: h,
        background: 0x060810,
        antialias: false, // perf
        resolution: Math.min(window.devicePixelRatio, 1.5),
        autoDensity: true,
      });
      if (destroyedRef.current) { app.destroy(true); return; }
      el.appendChild(app.canvas);

      // Generate galaxy-like node positions
      const nodes: { x: number; y: number; size: number; alpha: number }[] = [];
      const cx = w / 2, cy = h / 2;
      const maxR = Math.min(w, h) * 0.45;

      for (let i = 0; i < NODE_COUNT; i++) {
        // Spiral arm distribution
        const arm = Math.floor(Math.random() * 4);
        const armAngle = (arm / 4) * Math.PI * 2;
        const t = Math.random();
        const dist = t * maxR;
        const spread = (0.3 + t * 0.7) * 0.6;
        const angle = armAngle + t * 3 + (Math.random() - 0.5) * spread;

        const x = cx + Math.cos(angle) * dist + (Math.random() - 0.5) * 20;
        const y = cy + Math.sin(angle) * dist + (Math.random() - 0.5) * 20;

        const centerDist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR;
        const size = centerDist < 0.2 ? 0.8 + Math.random() * 1.5 : 0.3 + Math.random() * 0.8;
        const alpha = centerDist < 0.15 ? 0.5 + Math.random() * 0.4 : 0.1 + Math.random() * 0.3;

        nodes.push({ x, y, size, alpha });
      }

      // Generate edges (nearby connections)
      const edgeGfx = new PIXI.Graphics();
      app.stage.addChild(edgeGfx);

      // Use grid for spatial lookup
      const cellSize = 30;
      const grid = new Map<string, number[]>();
      nodes.forEach((n, i) => {
        const key = `${Math.floor(n.x / cellSize)},${Math.floor(n.y / cellSize)}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(i);
      });

      let edgesDrawn = 0;
      for (let i = 0; i < NODE_COUNT && edgesDrawn < EDGE_COUNT; i++) {
        const n = nodes[i];
        const gx = Math.floor(n.x / cellSize);
        const gy = Math.floor(n.y / cellSize);

        for (let dx = -1; dx <= 1 && edgesDrawn < EDGE_COUNT; dx++) {
          for (let dy = -1; dy <= 1 && edgesDrawn < EDGE_COUNT; dy++) {
            const neighbors = grid.get(`${gx + dx},${gy + dy}`);
            if (!neighbors) continue;
            for (const j of neighbors) {
              if (j <= i) continue;
              if (Math.random() > 0.15) continue;
              const n2 = nodes[j];
              const dist = Math.sqrt((n.x - n2.x) ** 2 + (n.y - n2.y) ** 2);
              if (dist > 40) continue;
              edgeGfx.moveTo(n.x, n.y);
              edgeGfx.lineTo(n2.x, n2.y);
              edgeGfx.stroke({ color: 0xffffff, alpha: 0.015, width: 0.3 });
              edgesDrawn++;
            }
          }
        }
      }

      // Draw nodes
      const nodeGfx = new PIXI.Graphics();
      app.stage.addChild(nodeGfx);

      for (const n of nodes) {
        nodeGfx.circle(n.x, n.y, n.size);
        nodeGfx.fill({ color: 0xffffff, alpha: n.alpha });
      }

      // Glow core
      const coreGfx = new PIXI.Graphics();
      coreGfx.circle(cx, cy, 4);
      coreGfx.fill({ color: 0xffffff, alpha: 0.9 });
      app.stage.addChild(coreGfx);

      // Pan/zoom
      let vx = 0, vy = 0, vs = 1;
      let dragging = false, lastMx = 0, lastMy = 0;

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        vs = Math.max(0.3, Math.min(4, vs * delta));
        app.stage.scale.set(vs);
        // Zoom toward center
        app.stage.x = w / 2 - (w / 2 - app.stage.x) * delta;
        app.stage.y = h / 2 - (h / 2 - app.stage.y) * delta;
      };

      const onPointerDown = (e: PointerEvent) => {
        dragging = true;
        lastMx = e.clientX;
        lastMy = e.clientY;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        app.stage.x += e.clientX - lastMx;
        app.stage.y += e.clientY - lastMy;
        lastMx = e.clientX;
        lastMy = e.clientY;
      };
      const onPointerUp = () => { dragging = false; };

      el.addEventListener('wheel', onWheel, { passive: false });
      el.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      // Slow rotate
      let frame = 0;
      const tick = () => {
        if (destroyedRef.current) return;
        if (!dragging) {
          frame++;
          // Subtle auto-rotation via pivot
          app.stage.rotation = Math.sin(frame * 0.0003) * 0.02;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      (containerRef as any)._cleanup = () => {
        el.removeEventListener('wheel', onWheel);
        el.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        app.destroy(true);
      };
    };

    init();
    return () => {
      destroyedRef.current = true;
      if ((containerRef as any)._cleanup) (containerRef as any)._cleanup();
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />;
}
