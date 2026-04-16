'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Stack, Text, TextInput, UnstyledButton, Group } from '@mantine/core';
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

  return <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' }} />;
}

/* ──────────────────────────────────────────────
 * LandingDemo — 세로 중앙 정렬
 * 구체 → 로고 → 입력창 → 시나리오
 * ──────────────────────────────────────────────*/
export function LandingDemo() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const scenarios = getScenariosByStage('guest');

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    // pendingMessage를 store에 저장하고 /chat으로 이동
    useChatStore.getState().setPendingMessage(text);
    router.push('/chat');
  }, [input, router]);

  const handleScenarioClick = useCallback((scenarioId: string) => {
    router.push(`/chat?scenario=${scenarioId}`);
  }, [router]);

  const handleLogin = useCallback(() => router.push('/login'), [router]);
  const handleSignUp = useCallback(() => router.push('/login?signup=true'), [router]);

  return (
    <Box
      data-mantine-color-scheme="dark"
      style={{
        height: '100dvh',
        overflow: 'hidden',
        background: '#060810',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* 우상단: Log in / Sign up */}
      <Group
        gap={0}
        style={{
          position: 'absolute',
          top: 20,
          right: 24,
          zIndex: 10,
          fontSize: 13,
        }}
      >
        <UnstyledButton
          onClick={handleLogin}
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', padding: '4px 12px', transition: 'color 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
        >
          Log in
        </UnstyledButton>
        <Text span style={{ color: 'rgba(255,255,255,0.2)' }}>|</Text>
        <UnstyledButton
          onClick={handleSignUp}
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', padding: '4px 12px', transition: 'color 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
        >
          가입하기
        </UnstyledButton>
      </Group>

      {/* 구체 */}
      <Box
        style={{
          width: '100%',
          height: '30vh',
          minHeight: 180,
          maxHeight: 320,
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
        }}
        className="ou-sphere-container"
      >
        <DotSphere />
      </Box>

      {/* 로고 + 입력 + 시나리오 */}
      <Stack gap={20} align="center" style={{ flexShrink: 0, padding: '0 24px', maxWidth: 560, width: '100%', position: 'relative', zIndex: 2 }}>
        {/* 로고 */}
        <Stack gap={4} align="center">
          <Text
            style={{
              fontFamily: 'var(--ou-font-logo)',
              fontSize: 48,
              fontWeight: 900,
              lineHeight: 1,
              color: '#fff',
              letterSpacing: '2px',
            }}
          >
            OU
          </Text>
          <Text
            style={{
              fontFamily: 'var(--ou-font-logo)',
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '5px',
              textTransform: 'uppercase' as const,
            }}
          >
            OWN UNIVERSE
          </Text>
          <Text
            style={{
              fontFamily: 'var(--ou-font-logo)',
              fontSize: 14,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '3px',
              marginTop: 8,
            }}
          >
            Just talk.
          </Text>
        </Stack>

        {/* 입력창 — pill shape, 글래스 */}
        <Box style={{ width: '100%', position: 'relative' }}>
          <TextInput
            placeholder="뭐든 말씀해보세요..."
            value={input}
            onChange={e => setInput(e.currentTarget.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            size="lg"
            rightSection={
              input.trim() ? (
                <UnstyledButton onClick={handleSubmit} style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <PaperPlaneRight size={18} weight="bold" />
                </UnstyledButton>
              ) : null
            }
            styles={{
              input: {
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 999,
                color: '#fff',
                fontSize: 15,
                height: 52,
                paddingLeft: 24,
                paddingRight: 48,
                '&::placeholder': {
                  color: 'rgba(255,255,255,0.3)',
                },
                '&:focus': {
                  borderColor: 'rgba(255,255,255,0.25)',
                },
              },
            }}
          />
        </Box>

        {/* 시나리오 버튼 */}
        <Group
          gap={8}
          justify="center"
          wrap="wrap"
          className="ou-scenario-buttons"
          style={{
            width: '100%',
            overflowX: 'auto',
            flexWrap: 'wrap',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {scenarios.map(scenario => {
            const IconComponent = SCENARIO_ICONS[scenario.icon] ?? Star;
            return (
              <UnstyledButton
                key={scenario.id}
                onClick={() => handleScenarioClick(scenario.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  transition: 'all 150ms',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
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
                <Text fz={12} style={{ color: 'rgba(255,255,255,0.6)' }}>{scenario.title}</Text>
              </UnstyledButton>
            );
          })}
        </Group>
      </Stack>

      {/* Footer */}
      <Text
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 11,
          color: 'rgba(255,255,255,0.15)',
          letterSpacing: '1px',
          whiteSpace: 'nowrap',
        }}
      >
        ouuniverse.com
      </Text>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .ou-sphere-container {
            height: 25vh !important;
          }
          .ou-scenario-buttons {
            flex-wrap: nowrap !important;
            justify-content: flex-start !important;
            overflow-x: auto !important;
            padding-bottom: 4px;
          }
          .ou-scenario-buttons::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>
    </Box>
  );
}
