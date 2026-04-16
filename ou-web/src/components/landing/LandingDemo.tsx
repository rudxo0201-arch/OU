'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  PaperPlaneRight, CalendarBlank, CurrencyKrw, CheckSquare, SmileyMeh,
  ListChecks, Barbell, Brain, Users, Notebook, Lightbulb, BookOpen,
  FunnelSimple, Gift, Star,
} from '@phosphor-icons/react';
import type { ComponentType } from 'react';

const SCENARIO_ICONS: Record<string, ComponentType<any>> = {
  CalendarBlank, CurrencyKrw, CheckSquare, SmileyMeh, ListChecks,
  Barbell, Brain, Users, Notebook, Lightbulb, BookOpen, FunnelSimple, Gift, Star,
};
import { useRouter } from 'next/navigation';
import { getScenariosByStage } from '@/data/scenarios';
import { useChatStore } from '@/stores/chatStore';

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

      await app.init({
        width: w, height: h,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      });

      if (destroyedRef.current) { app.destroy(true); return; }
      container.appendChild(app.canvas);

      const NUM_POINTS = window.innerWidth < 768 ? 500 : 800;
      const RADIUS = Math.min(w, h) * 0.4;
      const CENTER_X = w * 0.5;
      const CENTER_Y = h * 0.5;
      const PERSPECTIVE = 800;
      const DOT_COLOR = 0xaaaaaa;

      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const points: { baseX: number; baseY: number; baseZ: number }[] = [];

      for (let i = 0; i < NUM_POINTS; i++) {
        const y = 1 - (i / (NUM_POINTS - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        points.push({
          baseX: Math.cos(theta) * r * RADIUS,
          baseY: y * RADIUS,
          baseZ: Math.sin(theta) * r * RADIUS,
        });
      }

      const gfx = new PIXI.Graphics();
      app.stage.addChild(gfx);

      let rotY = 0, rotX = 0;
      let dragging = false;
      let lastPointer = { x: 0, y: 0 };
      let velocityX = 0, velocityY = 0;
      let mouseX = -9999, mouseY = -9999;
      let frameCount = 0;

      const onPointerDown = (e: PointerEvent) => { dragging = true; lastPointer = { x: e.clientX, y: e.clientY }; velocityX = 0; velocityY = 0; };
      const onPointerMove = (e: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        mouseX = e.clientX - rect.left; mouseY = e.clientY - rect.top;
        if (dragging) {
          const dx = e.clientX - lastPointer.x, dy = e.clientY - lastPointer.y;
          velocityY = dx * 0.005; velocityX = dy * 0.005;
          rotY += dx * 0.005; rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX + dy * 0.005));
          lastPointer = { x: e.clientX, y: e.clientY };
        }
      };
      const onPointerUp = () => { dragging = false; };
      const onPointerLeave = () => { mouseX = -9999; mouseY = -9999; dragging = false; };

      container.addEventListener('pointerdown', onPointerDown);
      container.addEventListener('pointermove', onPointerMove);
      container.addEventListener('pointerup', onPointerUp);
      container.addEventListener('pointerleave', onPointerLeave);

      const animate = () => {
        if (destroyedRef.current) return;
        frameCount++;

        if (!dragging) {
          rotY += 0.002 + velocityY; rotX += velocityX;
          velocityY *= 0.95; velocityX *= 0.95;
          rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX));
        }

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
          let sx = CENTER_X + x * scale;
          let sy = CENTER_Y + y * scale;

          const nz = (z + RADIUS) / (2 * RADIUS);
          const dotSize = 0.8 + nz * 2.5;
          let alpha = 0.15 + nz * 0.65;
          if (nz > 0.6) alpha += Math.sin(frameCount * 0.02 + i * 0.1) * 0.15 * nz;

          const dxM = sx - mouseX, dyM = sy - mouseY;
          const dist = Math.sqrt(dxM * dxM + dyM * dyM);
          if (dist < 80 && dist > 0) {
            const force = (1 - dist / 80) * 30;
            sx += (dxM / dist) * force; sy += (dyM / dist) * force;
          }

          projected.push({ sx, sy, z, size: dotSize, alpha: Math.max(0.05, Math.min(1, alpha)) });
        }

        projected.sort((a, b) => a.z - b.z);
        for (const p of projected) {
          gfx.circle(p.sx, p.sy, p.size);
          gfx.fill({ color: DOT_COLOR, alpha: p.alpha });
        }

        animId = requestAnimationFrame(animate);
      };

      animId = requestAnimationFrame(animate);

      const onResize = () => {
        if (!container || destroyedRef.current) return;
        app.renderer.resize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener('resize', onResize);

      (containerRef as any)._cleanup = () => {
        window.removeEventListener('resize', onResize);
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerup', onPointerUp);
        container.removeEventListener('pointerleave', onPointerLeave);
        cancelAnimationFrame(animId);
        app.destroy(true);
      };
    };

    init();
    return () => {
      destroyedRef.current = true;
      if ((containerRef as any)._cleanup) (containerRef as any)._cleanup();
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

/* ──────────────────────────────────────────────
 * LandingDemo — 순수 HTML + inline style
 * Mantine 의존 제거 (하이드레이션 깨짐 방지)
 * ──────────────────────────────────────────────*/
export function LandingDemo() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const scenarios = getScenariosByStage('guest');

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    useChatStore.getState().setPendingMessage(text);
    router.push('/chat');
  }, [input, router]);

  const handleScenarioClick = useCallback((scenarioId: string) => {
    router.push(`/chat?scenario=${scenarioId}`);
  }, [router]);

  return (
    <div
      style={{
        height: '100dvh',
        overflow: 'hidden',
        background: '#060810',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* 별 배경 — 작고 은은하게 */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {Array.from({ length: 40 }, (_, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.4)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${3 + Math.random() * 4}s ease-in-out infinite alternate`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes twinkle { 0% { opacity: 0.1; } 100% { opacity: 0.5; } }`}</style>

      {/* 우상단: Log in / 가입하기 */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 10, display: 'flex', alignItems: 'center', gap: 0 }}>
        <button
          onClick={() => router.push('/login')}
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', padding: '4px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Log in
        </button>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>|</span>
        <button
          onClick={() => router.push('/login?signup=true')}
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', padding: '4px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          가입하기
        </button>
      </div>

      {/* 구체 — 전체 배경 (클릭 투과) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>
        <DotSphere />
      </div>

      {/* 콘텐츠 — 구체 위에 떠 있음 */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        width: '100%', maxWidth: 480, padding: '0 24px', position: 'relative', zIndex: 2,
      }}>
        {/* 콘텐츠 뒤 어두운 그라데이션 — 가독성 확보 */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(6,8,16,0.85) 0%, rgba(6,8,16,0.4) 50%, transparent 70%)',
          pointerEvents: 'none', zIndex: -1,
        }} />
        {/* 로고 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <img src="/ou-logo.png" alt="OU" style={{ width: 120, height: 'auto', objectFit: 'contain', filter: 'brightness(0.9)' }} />
          <div style={{ fontFamily: "var(--font-orbitron, 'Orbitron'), sans-serif", fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '5px', textTransform: 'uppercase' as const, marginTop: 8 }}>
            OWN UNIVERSE
          </div>
          <div style={{ fontFamily: "var(--font-orbitron, 'Orbitron'), sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.25)', letterSpacing: '3px', marginTop: 8 }}>
            Just talk.
          </div>
        </div>

        {/* 입력창 */}
        <div style={{ width: '100%', position: 'relative' }}>
          <input
            type="text"
            placeholder="뭐든 말씀해보세요..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
            style={{
              width: '100%',
              height: 52,
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 999,
              color: '#fff',
              fontSize: 15,
              paddingLeft: 24,
              paddingRight: 48,
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 180ms ease',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.25)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />
          {input.trim() && (
            <button
              onClick={handleSubmit}
              style={{
                position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <PaperPlaneRight size={18} weight="bold" />
            </button>
          )}
        </div>

        {/* 시나리오 버튼 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', width: '100%' }}>
          {scenarios.map(scenario => {
            const IconComponent = SCENARIO_ICONS[scenario.icon] ?? Star;
            return (
              <button
                key={scenario.id}
                onClick={() => handleScenarioClick(scenario.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'inherit',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <IconComponent size={14} weight="bold" style={{ color: 'rgba(255,255,255,0.5)' }} />
                {scenario.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, color: 'rgba(255,255,255,0.15)', letterSpacing: '1px', whiteSpace: 'nowrap',
      }}>
        ouuniverse.com
      </div>
    </div>
  );
}
