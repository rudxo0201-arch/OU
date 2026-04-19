'use client';

import { useEffect, useRef } from 'react';

interface Props {
  nodes: { id: string; label: string; x: number; y: number }[];
  edges: { from: string; to: string }[];
}

export function DemoGraph({ nodes, edges }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);
  const appRef = useRef<any>(null);
  const nodesMapRef = useRef<Map<string, any>>(new Map());
  const prevCountRef = useRef(0);

  // Init PixiJS once
  useEffect(() => {
    if (!containerRef.current) return;
    destroyedRef.current = false;

    const init = async () => {
      const PIXI = await import('pixi.js');
      if (destroyedRef.current || !containerRef.current) return;

      const app = new PIXI.Application();
      const el = containerRef.current;
      await app.init({
        width: el.clientWidth, height: el.clientHeight,
        backgroundAlpha: 0, antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2), autoDensity: true,
      });
      if (destroyedRef.current) { app.destroy(true); return; }
      el.appendChild(app.canvas);
      appRef.current = app;

      // Central "me" node
      const me = new PIXI.Graphics();
      me.circle(0, 0, 8);
      me.fill({ color: 0x000000, alpha: 0.76 });
      me.x = el.clientWidth / 2;
      me.y = el.clientHeight / 2;
      app.stage.addChild(me);
      nodesMapRef.current.set('me', me);
    };

    init();
    return () => {
      destroyedRef.current = true;
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, []);

  // Render nodes & edges
  useEffect(() => {
    const app = appRef.current;
    if (!app || !containerRef.current) return;

    const importPixi = async () => {
      const PIXI = await import('pixi.js');
      const el = containerRef.current!;
      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;

      // Add new nodes
      for (const node of nodes) {
        if (nodesMapRef.current.has(node.id)) continue;

        // Edge first (behind)
        const closestExisting = edges.find(e => e.from === node.id || e.to === node.id);
        if (closestExisting) {
          const otherId = closestExisting.from === node.id ? closestExisting.to : closestExisting.from;
          const other = nodesMapRef.current.get(otherId);
          if (other) {
            const line = new PIXI.Graphics();
            line.moveTo(other.x, other.y);
            line.lineTo(cx + (node.x - 200), cy + (node.y - 200));
            line.stroke({ color: 0x000000, alpha: 0.06, width: 0.5 });
            app.stage.addChildAt(line, 0);
          }
        }

        // Node dot
        const gfx = new PIXI.Graphics();
        gfx.circle(0, 0, 5);
        gfx.fill({ color: 0x000000, alpha: 0.48 });
        gfx.x = cx + (node.x - 200);
        gfx.y = cy + (node.y - 200);
        gfx.scale.set(0);
        app.stage.addChild(gfx);
        nodesMapRef.current.set(node.id, gfx);

        // Label
        const label = new PIXI.Text({ text: node.label, style: {
          fontSize: 10, fill: 'rgba(0,0,0,0.42)',
          fontFamily: "'Pretendard Variable', sans-serif",
        }});
        label.anchor.set(0.5, 0);
        label.x = gfx.x;
        label.y = gfx.y + 10;
        label.alpha = 0;
        app.stage.addChild(label);

        // Spawn animation
        let t = 0;
        const anim = () => {
          t += 0.06;
          if (t >= 1) {
            gfx.scale.set(1);
            label.alpha = 1;
            return;
          }
          const ease = 1 - Math.pow(1 - t, 3);
          gfx.scale.set(ease * 1.1);
          label.alpha = ease;
          requestAnimationFrame(anim);
        };
        requestAnimationFrame(anim);
      }
    };

    if (nodes.length > prevCountRef.current) {
      importPixi();
      prevCountRef.current = nodes.length;
    }
  }, [nodes, edges]);

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%',
      border: '0.5px solid var(--ou-border-subtle)',
      borderRadius: 'var(--ou-radius-card)',
      boxShadow: 'var(--ou-glow-sm)',
      overflow: 'hidden',
    }} />
  );
}
