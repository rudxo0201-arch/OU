'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Genesis empty state: shown when user has 0 data nodes.
 * Renders a canvas with a pulsing origin point and faint particle field
 * on #060810 background, evoking an empty universe waiting to be filled.
 */
export function GenesisEmptyState() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let destroyed = false;

    // Ambient particles
    const particles: { x: number; y: number; r: number; phase: number; speed: number }[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.3 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
      });
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      if (destroyed) return;
      animId = requestAnimationFrame(render);

      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      const cx = w / 2;
      const cy = h / 2 - 40; // slightly above center for visual balance
      const t = performance.now() / 1000;

      ctx.clearRect(0, 0, w, h);

      // Ambient particles (faint stars)
      particles.forEach(p => {
        const alpha = 0.15 + 0.15 * Math.sin(t * p.speed + p.phase);
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      });

      // Origin pulse rings (expanding outward)
      for (let i = 0; i < 3; i++) {
        const phase = (t * 0.5 + i * 0.33) % 1;
        const radius = phase * 60;
        const alpha = (1 - phase) * 0.12;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Core glow
      const glowRadius = 20 + Math.sin(t * 1.5) * 5;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Bright center dot
      const dotRadius = 3 + Math.sin(t * 2) * 1;
      ctx.beginPath();
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
    };

    render();

    return () => {
      destroyed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#060810',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      {/* Background canvas for pulsing origin animation */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Text overlay */}
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1, marginTop: 80 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-sm)' }}>아직 우주가 비어있어요</span>
          <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-xs)' }}>첫 대화를 시작하면 별이 태어나요</span>
        </div>

        <button
          onClick={() => router.push('/chat')}
          style={{
            padding: '10px 24px',
            fontSize: 'var(--mantine-font-size-md)',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '0.5px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--mantine-radius-md)',
            cursor: 'pointer',
            color: 'inherit',
          }}
        >
          대화 시작하기
        </button>
      </div>
    </div>
  );
}
