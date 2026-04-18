'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/* ──────────────────────────────────────────────
 * DotSphere — PixiJS WebGL particle sphere
 * ──────────────────────────────────────────────*/
function DotSphere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    destroyedRef.current = false;
    let animId: number;
    let app: any;

    const init = async () => {
      const PIXI = await import('pixi.js');
      if (destroyedRef.current || !containerRef.current) return;

      app = new PIXI.Application();
      const container = containerRef.current;
      const w = container.clientWidth;
      const h = container.clientHeight;

      await app.init({ width: w, height: h, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio, 2), autoDensity: true });
      if (destroyedRef.current) { app.destroy(true); return; }
      container.appendChild(app.canvas);

      const NUM_POINTS = window.innerWidth < 768 ? 500 : 800;
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
      let rotY = 0, rotX = 0, frameCount = 0;

      const animate = () => {
        if (destroyedRef.current) return;
        frameCount++;
        rotY += 0.002;
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        gfx.clear();

        const projected: { sx: number; sy: number; z: number; size: number; alpha: number }[] = [];
        for (let i = 0; i < NUM_POINTS; i++) {
          const p = points[i];
          let x = p.baseX * cosY + p.baseZ * sinY;
          let z = -p.baseX * sinY + p.baseZ * cosY;
          let y = p.baseY;
          const y2 = y * cosX - z * sinX;
          const z2 = y * sinX + z * cosX;
          y = y2; z = z2;
          const scale = PERSPECTIVE / (PERSPECTIVE + z);
          const sx = CENTER_X + x * scale;
          const sy = CENTER_Y + y * scale;
          const nz = (z + RADIUS) / (2 * RADIUS);
          const dotSize = 0.8 + nz * 2.5;
          let alpha = 0.15 + nz * 0.65;
          if (nz > 0.6) alpha += Math.sin(frameCount * 0.02 + i * 0.1) * 0.15 * nz;
          projected.push({ sx, sy, z, size: dotSize, alpha: Math.max(0.05, Math.min(1, alpha)) });
        }
        projected.sort((a, b) => a.z - b.z);
        for (const p of projected) {
          gfx.circle(p.sx, p.sy, p.size);
          gfx.fill({ color: 0xaaaaaa, alpha: p.alpha });
        }
        animId = requestAnimationFrame(animate);
      };
      animId = requestAnimationFrame(animate);

      const onResize = () => { if (!container || destroyedRef.current) return; app.renderer.resize(container.clientWidth, container.clientHeight); };
      window.addEventListener('resize', onResize);
      (containerRef as any)._cleanup = () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(animId); app.destroy(true); };
    };

    init();
    return () => { destroyedRef.current = true; if ((containerRef as any)._cleanup) (containerRef as any)._cleanup(); };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

/* ──────────────────────────────────────────────
 * LandingDemo — 좌: 구체 | 우: 브랜딩 + CTA
 * 경계선 없음, 배경 연속
 * ──────────────────────────────────────────────*/
export function LandingDemo() {
  const router = useRouter();

  return (
    <div style={{
      height: '100dvh',
      overflow: 'hidden',
      background: '#060810',
      display: 'flex',
      flexDirection: 'row',
      fontFamily: "'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    }}>
      {/* 좌측: 구체 */}
      <div style={{ flex: 1, position: 'relative', marginRight: -120 }}>
        <DotSphere />
      </div>

      {/* 우측: 브랜딩 + CTA */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '0 48px 0 0',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* 로고 + 브랜딩 — 너비 통일 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 240 }}>
          <span style={{ fontFamily: "var(--font-orbitron, 'Orbitron'), sans-serif", fontSize: 48, fontWeight: 700, color: 'var(--ou-text-bright)', textShadow: '0 0 40px rgba(255,255,255,0.15)' }}>OU</span>
          <div style={{
            fontFamily: "var(--font-orbitron, 'Orbitron'), sans-serif",
            fontSize: 9,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '6px',
            textTransform: 'uppercase' as const,
            marginTop: 12,
            width: '100%',
            textAlign: 'center',
          }}>
            OWN UNIVERSE
          </div>
        </div>
        <div style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '2px',
          marginTop: 4,
          width: 240,
          textAlign: 'center',
        }}>
          말하면, 우주가 됩니다
        </div>

        {/* Try it 버튼 — 하얀 테두리 + 글로우 */}
        <button
          onClick={() => router.push('/try')}
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '1px',
            padding: '14px 48px',
            width: 240,
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.8)',
            background: 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 0 20px 4px rgba(255,255,255,0.08), 0 0 40px 8px rgba(255,255,255,0.04)',
            transition: 'all 200ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 0 24px 6px rgba(255,255,255,0.15), 0 0 48px 12px rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 0 20px 4px rgba(255,255,255,0.08), 0 0 40px 8px rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)';
          }}
        >
          Try it
        </button>

        {/* Log in | Sign up */}
        <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'inherit',
              padding: '4px 12px', transition: 'color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            Log in
          </button>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>|</span>
          <button
            onClick={() => router.push('/login?signup=true')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'inherit',
              padding: '4px 12px', transition: 'color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            Sign up
          </button>
        </div>
      </div>

      {/* 하단 ouuniverse.com */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, color: 'rgba(255,255,255,0.12)', letterSpacing: '1px',
      }}>
        ouuniverse.com
      </div>
    </div>
  );
}
