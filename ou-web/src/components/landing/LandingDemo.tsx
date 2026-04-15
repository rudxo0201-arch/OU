'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Box, Stack, Text, UnstyledButton, Group } from '@mantine/core';
import { ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

/* ──────────────────────────────────────────────
 * DotSphere — PixiJS WebGL particle sphere
 * 피보나치 구체 + 드래그 회전 + repulsion + 브리딩
 * ──────────────────────────────────────────────*/
function DotSphere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
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
      appRef.current = app;

      const container = containerRef.current;
      const w = container.clientWidth;
      const h = container.clientHeight;

      await app.init({
        width: w,
        height: h,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      });

      if (destroyedRef.current) {
        app.destroy(true);
        return;
      }

      container.appendChild(app.canvas);

      // ── 피보나치 구체 점 생성 ──
      const isMobile = window.innerWidth < 768;
      const NUM_POINTS = isMobile ? 500 : 800;
      const RADIUS = Math.min(w, h) * 0.38;
      const CENTER_X = w * 0.5;
      const CENTER_Y = h * 0.5;
      const PERSPECTIVE = 800;
      const DOT_COLOR = 0x1a1a1a;

      // 피보나치 구체 좌표
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const points: { theta: number; phi: number; baseX: number; baseY: number; baseZ: number; dx: number; dy: number }[] = [];

      for (let i = 0; i < NUM_POINTS; i++) {
        const y = 1 - (i / (NUM_POINTS - 1)) * 2; // -1 to 1
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        const baseX = Math.cos(theta) * radiusAtY * RADIUS;
        const baseY = y * RADIUS;
        const baseZ = Math.sin(theta) * radiusAtY * RADIUS;
        points.push({ theta: 0, phi: 0, baseX, baseY, baseZ, dx: 0, dy: 0 });
      }

      // ── Graphics 렌더러 ──
      const gfx = new PIXI.Graphics();
      app.stage.addChild(gfx);

      // ── 인터랙션 상태 ──
      let rotY = 0; // Y축 회전각
      let rotX = 0; // X축 회전각
      let autoRotSpeed = 0.002;
      let dragging = false;
      let lastPointer = { x: 0, y: 0 };
      let velocityX = 0;
      let velocityY = 0;
      let mouseX = -9999;
      let mouseY = -9999;
      const REPULSION_RADIUS = 80;
      const REPULSION_STRENGTH = 30;
      let frameCount = 0;

      // 마우스/터치 이벤트
      const onPointerDown = (e: PointerEvent) => {
        dragging = true;
        lastPointer = { x: e.clientX, y: e.clientY };
        velocityX = 0;
        velocityY = 0;
      };
      const onPointerMove = (e: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;

        if (dragging) {
          const dx = e.clientX - lastPointer.x;
          const dy = e.clientY - lastPointer.y;
          velocityY = dx * 0.005;
          velocityX = dy * 0.005;
          rotY += dx * 0.005;
          rotX += dy * 0.005;
          // X축 회전 제한
          rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX));
          lastPointer = { x: e.clientX, y: e.clientY };
        }
      };
      const onPointerUp = () => {
        dragging = false;
      };
      const onPointerLeave = () => {
        mouseX = -9999;
        mouseY = -9999;
        dragging = false;
      };

      // 터치 이벤트
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          dragging = true;
          lastPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          velocityX = 0;
          velocityY = 0;
        }
      };
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const rect = container.getBoundingClientRect();
          mouseX = e.touches[0].clientX - rect.left;
          mouseY = e.touches[0].clientY - rect.top;

          if (dragging) {
            const dx = e.touches[0].clientX - lastPointer.x;
            const dy = e.touches[0].clientY - lastPointer.y;
            velocityY = dx * 0.005;
            velocityX = dy * 0.005;
            rotY += dx * 0.005;
            rotX += dy * 0.005;
            rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX));
            lastPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }
        }
      };
      const onTouchEnd = () => {
        dragging = false;
        mouseX = -9999;
        mouseY = -9999;
      };

      container.addEventListener('pointerdown', onPointerDown);
      container.addEventListener('pointermove', onPointerMove);
      container.addEventListener('pointerup', onPointerUp);
      container.addEventListener('pointerleave', onPointerLeave);
      container.addEventListener('touchstart', onTouchStart, { passive: true });
      container.addEventListener('touchmove', onTouchMove, { passive: true });
      container.addEventListener('touchend', onTouchEnd);

      // ── 애니메이션 루프 ──
      const animate = () => {
        if (destroyedRef.current) return;

        frameCount++;

        // 자동 회전 (드래그 중이 아닐 때)
        if (!dragging) {
          rotY += autoRotSpeed;
          // 관성 감쇠
          rotY += velocityY;
          rotX += velocityX;
          velocityY *= 0.95;
          velocityX *= 0.95;
          rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX));
        }

        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        gfx.clear();

        // Z-sort를 위한 임시 배열
        const projected: { sx: number; sy: number; z: number; size: number; alpha: number }[] = [];

        for (let i = 0; i < NUM_POINTS; i++) {
          const p = points[i];

          // Y축 회전
          let x = p.baseX * cosY + p.baseZ * sinY;
          let z = -p.baseX * sinY + p.baseZ * cosY;
          let y = p.baseY;

          // X축 회전
          const y2 = y * cosX - z * sinX;
          const z2 = y * sinX + z * cosX;
          y = y2;
          z = z2;

          // Perspective projection
          const scale = PERSPECTIVE / (PERSPECTIVE + z);
          let sx = CENTER_X + x * scale;
          let sy = CENTER_Y + y * scale;

          // 깊이 기반 크기/알파
          const normalizedZ = (z + RADIUS) / (2 * RADIUS); // 0(뒤)~1(앞)
          const dotSize = 0.8 + normalizedZ * 2.5;
          let alpha = 0.12 + normalizedZ * 0.6;

          // 브리딩 (앞쪽 점만)
          if (normalizedZ > 0.6) {
            const breathe = Math.sin(frameCount * 0.02 + i * 0.1) * 0.15;
            alpha += breathe * normalizedZ;
          }

          // Repulsion
          const dxMouse = sx - mouseX;
          const dyMouse = sy - mouseY;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          if (distMouse < REPULSION_RADIUS && distMouse > 0) {
            const force = (1 - distMouse / REPULSION_RADIUS) * REPULSION_STRENGTH;
            sx += (dxMouse / distMouse) * force;
            sy += (dyMouse / distMouse) * force;
          }

          projected.push({ sx, sy, z, size: dotSize, alpha: Math.max(0.05, Math.min(1, alpha)) });
        }

        // Z-sort: 뒤쪽 먼저 그리기
        projected.sort((a, b) => a.z - b.z);

        for (const p of projected) {
          gfx.circle(p.sx, p.sy, p.size);
          gfx.fill({ color: DOT_COLOR, alpha: p.alpha });
        }

        animId = requestAnimationFrame(animate);
      };

      animId = requestAnimationFrame(animate);

      // 리사이즈 핸들러
      const onResize = () => {
        if (!container || destroyedRef.current) return;
        const nw = container.clientWidth;
        const nh = container.clientHeight;
        app.renderer.resize(nw, nh);
      };
      window.addEventListener('resize', onResize);

      // cleanup 참조 저장
      (containerRef as any)._cleanup = () => {
        window.removeEventListener('resize', onResize);
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerup', onPointerUp);
        container.removeEventListener('pointerleave', onPointerLeave);
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchmove', onTouchMove);
        container.removeEventListener('touchend', onTouchEnd);
        cancelAnimationFrame(animId);
        app.destroy(true);
      };
    };

    init();

    return () => {
      destroyedRef.current = true;
      if ((containerRef as any)._cleanup) {
        (containerRef as any)._cleanup();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: 'grab',
        touchAction: 'none',
      }}
    />
  );
}

/* ──────────────────────────────────────────────
 * LandingDemo — 랜딩페이지
 * ──────────────────────────────────────────────*/
export function LandingDemo() {
  const router = useRouter();

  const handleTry = useCallback(() => {
    router.push('/chat');
  }, [router]);

  const handleSignIn = useCallback(() => {
    router.push('/login');
  }, [router]);

  const handleSignUp = useCallback(() => {
    router.push('/login?signup=true');
  }, [router]);

  return (
    <>
      {/* ── Desktop Layout (>= 768) ─────────── */}
      <Box
        visibleFrom="sm"
        style={{
          display: 'flex',
          height: '100dvh',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        {/* Left — Dot Sphere */}
        <Box
          style={{
            width: '55%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DotSphere />
        </Box>

        {/* Right — CTA */}
        <Box
          style={{
            width: '45%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 48,
          }}
        >
          <Stack gap={32} align="center">
            {/* Logo */}
            <Stack gap={10} align="center">
              <Text
                style={{
                  fontFamily: 'var(--ou-font-logo)',
                  fontSize: 80,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#000',
                  letterSpacing: '2px',
                }}
              >
                OU
              </Text>
              <Text
                style={{
                  fontFamily: 'var(--ou-font-logo)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#999',
                  letterSpacing: '6px',
                  textTransform: 'uppercase' as const,
                }}
              >
                OWN UNIVERSE
              </Text>
            </Stack>

            {/* Tagline */}
            <Text
              style={{
                fontSize: 22,
                fontWeight: 300,
                color: '#555',
                letterSpacing: '1px',
              }}
            >
              Just talk.
            </Text>

            {/* CTA Button */}
            <UnstyledButton
              onClick={handleTry}
              style={{
                padding: '14px 48px',
                borderRadius: 999,
                background: '#1a1a1a',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 200ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#333';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#1a1a1a';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              TRY IT
              <ArrowRight size={16} weight="bold" />
            </UnstyledButton>

            {/* Sign in / Sign up */}
            <Group gap={0} style={{ fontSize: 13, color: '#999' }}>
              <UnstyledButton
                onClick={handleSignIn}
                style={{
                  fontSize: 13,
                  color: '#999',
                  padding: '4px 12px',
                  transition: 'color 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#333'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#999'; }}
              >
                Sign in
              </UnstyledButton>
              <Text span c="#ccc">|</Text>
              <UnstyledButton
                onClick={handleSignUp}
                style={{
                  fontSize: 13,
                  color: '#999',
                  padding: '4px 12px',
                  transition: 'color 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#333'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#999'; }}
              >
                Sign up
              </UnstyledButton>
            </Group>
          </Stack>
        </Box>
      </Box>

      {/* ── Mobile Layout (< 768) ─────────── */}
      <Box
        hiddenFrom="sm"
        style={{
          height: '100dvh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
        }}
      >
        {/* Top — Dot Sphere */}
        <Box
          style={{
            height: '45vh',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <DotSphere />
        </Box>

        {/* Bottom — CTA */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Stack gap={20} align="center">
            {/* Logo */}
            <Stack gap={6} align="center">
              <Text
                style={{
                  fontFamily: 'var(--ou-font-logo)',
                  fontSize: 48,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#000',
                  letterSpacing: '1px',
                }}
              >
                OU
              </Text>
              <Text
                style={{
                  fontFamily: 'var(--ou-font-logo)',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#999',
                  letterSpacing: '5px',
                  textTransform: 'uppercase' as const,
                }}
              >
                OWN UNIVERSE
              </Text>
            </Stack>

            {/* Tagline */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: 300,
                color: '#555',
                letterSpacing: '1px',
              }}
            >
              Just talk.
            </Text>

            {/* CTA Button */}
            <UnstyledButton
              onClick={handleTry}
              style={{
                padding: '12px 40px',
                borderRadius: 999,
                background: '#1a1a1a',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              TRY IT
              <ArrowRight size={14} weight="bold" />
            </UnstyledButton>

            {/* Sign in / Sign up */}
            <Group gap={0} style={{ fontSize: 12, color: '#999' }}>
              <UnstyledButton
                onClick={handleSignIn}
                style={{ fontSize: 12, color: '#999', padding: '4px 10px' }}
              >
                Sign in
              </UnstyledButton>
              <Text span c="#ccc">|</Text>
              <UnstyledButton
                onClick={handleSignUp}
                style={{ fontSize: 12, color: '#999', padding: '4px 10px' }}
              >
                Sign up
              </UnstyledButton>
            </Group>
          </Stack>
        </Box>
      </Box>
    </>
  );
}
