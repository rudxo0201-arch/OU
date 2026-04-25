'use client';

import { useRef, useEffect } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  alphaTarget: number;
  alphaSpeed: number;
  speed: number;
  layer: number;
}

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;
    const stars: Star[] = [];
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W() * dpr;
      canvas.height = H() * dpr;
      canvas.style.width = W() + 'px';
      canvas.style.height = H() + 'px';
      // transform은 draw 루프에서 setTransform으로 매 프레임 세팅 — 누적 방지
    };

    const makeStar = (): Star => {
      const layer = Math.random() < 0.55 ? 0 : Math.random() < 0.6 ? 1 : 2;
      return {
        x: Math.random() * W(),
        y: Math.random() * H(),
        size: layer === 0 ? 0.3 + Math.random() * 0.5
             : layer === 1 ? 0.6 + Math.random() * 0.8
             :               0.9 + Math.random() * 1.2,
        alpha: Math.random() * 0.6 + 0.1,
        alphaTarget: Math.random() * 0.6 + 0.1,
        alphaSpeed: 0.002 + Math.random() * 0.004,
        speed: layer === 0 ? 0.015 : layer === 1 ? 0.03 : 0.055,
        layer,
      };
    };

    resize();
    for (let i = 0; i < 320; i++) stars.push(makeStar());
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    });

    const draw = () => {
      const w = W(), h = H();

      // DPR transform — setTransform으로 매 프레임 리셋 (누적 없음)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const isDark = document.documentElement.dataset.theme !== 'light';
      if (!isDark) { animId = requestAnimationFrame(draw); return; }

      // 마우스 위치 부드럽게 보간 (패럴랙스 흔들림 방지)
      mouseX += (targetMouseX - mouseX) * 0.06;
      mouseY += (targetMouseY - mouseY) * 0.06;

      const px = (mouseX / w - 0.5) * 2;
      const py = (mouseY / h - 0.5) * 2;

      for (const s of stars) {
        // Twinkle
        if (Math.abs(s.alpha - s.alphaTarget) < 0.01) {
          s.alphaTarget = Math.random() * 0.6 + 0.1;
        }
        s.alpha += (s.alphaTarget - s.alpha) * s.alphaSpeed;

        // 패럴랙스 — layer 2는 최대 4px, 흔들림 최소화
        const parallaxX = px * s.layer * 2;
        const parallaxY = py * s.layer * 1.5;

        const sx = s.x + parallaxX;
        const sy = s.y + parallaxY;

        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha.toFixed(3)})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
}
