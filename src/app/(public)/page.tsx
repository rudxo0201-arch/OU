'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import { PageLayout, GlassCard, GlassButton } from '@/components/ds';

// DotSphere — PixiJS 파티클 구체 (SSR 불필요)
const DotSphere = dynamic(
  () => import('@/components/landing/DotSphere').then(m => ({ default: m.DotSphere })),
  { ssr: false, loading: () => null }
);

// DemoChat + DemoGraph — 인터랙티브 데모
const DemoChat = dynamic(
  () => import('@/components/landing/DemoChat').then(m => ({ default: m.DemoChat })),
  { ssr: false, loading: () => null }
);
const DemoGraph = dynamic(
  () => import('@/components/landing/DemoGraph').then(m => ({ default: m.DemoGraph })),
  { ssr: false, loading: () => null }
);

const features = [
  {
    icon: '✦',
    title: '대화가 곧 입력',
    desc: '키보드, 마우스, 폼이 아니라 말로 데이터를 만든다. 대충 말해도 알아듣는다.',
  },
  {
    icon: '⬡',
    title: '구조화는 AI가',
    desc: 'LLM이 자동으로 도메인을 분류하고 DataNode를 만든다. 당신은 그냥 말하면 된다.',
  },
  {
    icon: '◈',
    title: '뷰는 무한',
    desc: '같은 데이터를 캘린더, 그래프, 카드, 차트 등 어떤 형태로든 꺼내 볼 수 있다.',
  },
];

// 인터랙티브 데모 섹션 (DemoChat ↔ DemoGraph 상태 브릿지)
function DemoSection() {
  const [nodes, setNodes] = useState<{ id: string; label: string; x: number; y: number }[]>([
    { id: 'me', label: 'me', x: 0.5, y: 0.5 },
  ]);
  const [edges, setEdges] = useState<{ from: string; to: string }[]>([]);

  const onNodeCreated = useCallback((node: { id: string; label: string }) => {
    setNodes(prev => {
      if (prev.find(n => n.id === node.id)) return prev;
      return [...prev, { ...node, x: 0.3 + Math.random() * 0.4, y: 0.2 + Math.random() * 0.6 }];
    });
  }, []);

  const onEdgeCreated = useCallback((edge: { from: string; to: string }) => {
    setEdges(prev => {
      if (prev.find(e => e.from === edge.from && e.to === edge.to)) return prev;
      return [...prev, edge];
    });
  }, []);

  return (
    <section style={{ padding: '0 24px 96px', maxWidth: 1024, margin: '0 auto' }}>
      <div style={{
        textAlign: 'center',
        marginBottom: 48,
      }}>
        <p style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--ou-text-muted)', fontFamily: 'var(--ou-font-logo)', marginBottom: 12,
        }}>
          Live Demo
        </p>
        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700,
          color: 'var(--ou-text-heading)', letterSpacing: '-0.03em', lineHeight: 1.2,
        }}>
          말하면 데이터가 된다
        </h2>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        minHeight: 480,
      }}>
        {/* 좌: DemoChat */}
        <div>
          <DemoChat onNodeCreated={onNodeCreated} onEdgeCreated={onEdgeCreated} />
        </div>

        {/* 우: DemoGraph */}
        <GlassCard style={{ overflow: 'hidden', minHeight: 480, padding: 0 }}>
          <div style={{ width: '100%', height: '100%', minHeight: 480 }}>
            <DemoGraph nodes={nodes} edges={edges} />
          </div>
        </GlassCard>
      </div>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--ou-text-disabled)' }}>
        실제로 돌아가는 데모입니다 — 대화가 그래프 노드로 변환됩니다
      </p>
    </section>
  );
}

export default function LandingPage() {
  return (
    <PageLayout>
      {/* 네비바 */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: 56,
        background: 'rgba(228,228,234,0.96)',
        borderBottom: '1px solid var(--ou-glass-border)',
      }}>
        <span style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--ou-text-heading)',
          letterSpacing: '-0.02em',
        }}>
          OU
        </span>
        <Link href="/login">
          <GlassButton size="sm">Log in</GlassButton>
        </Link>
      </nav>

      {/* 히어로 */}
      <section style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '80px 32px 64px',
        maxWidth: 1200,
        margin: '0 auto',
        overflow: 'hidden',
      }}>
        {/* 좌측: 텍스트 */}
        <div style={{ flex: '0 0 auto', maxWidth: 540, position: 'relative', zIndex: 2 }}>
          {/* OU 로고 오브 */}
          <div style={{ position: 'relative', marginBottom: 40, display: 'inline-block' }}>
            <div style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(var(--ou-accent-rgb), 0.2) 0%, rgba(var(--ou-accent-rgb), 0.05) 60%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(var(--ou-accent-rgb), 0.2)',
            }}>
              <span style={{
                fontFamily: 'var(--ou-font-logo)',
                fontSize: 36,
                fontWeight: 800,
                color: 'var(--ou-text-heading)',
                letterSpacing: '-0.03em',
              }}>
                OU
              </span>
            </div>
            <div style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: '1px solid rgba(var(--ou-accent-rgb), 0.1)',
              animation: 'ou-glow-pulse 3s ease-in-out infinite',
            }} />
          </div>

          {/* 헤드라인 */}
          <h1 style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 700,
            color: 'var(--ou-text-heading)',
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            marginBottom: 20,
          }}>
            Just talk.
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: 'var(--ou-text-secondary)',
            lineHeight: 1.6,
            maxWidth: 420,
            marginBottom: 40,
            letterSpacing: '-0.01em',
          }}>
            대화로 만드는 나만의 우주.<br />
            말하는 순간 데이터가 된다.
          </p>

          <Link href="/login?tab=signup">
            <GlassButton variant="accent" size="lg">
              시작하기 →
            </GlassButton>
          </Link>
        </div>

        {/* 우측: DotSphere */}
        <div style={{
          position: 'absolute',
          right: -80,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 640,
          height: 640,
          opacity: 0.7,
          pointerEvents: 'none',
        }}>
          <DotSphere />
        </div>
      </section>

      {/* Features */}
      <section style={{
        padding: '0 24px 96px',
        maxWidth: 1024,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {features.map((f) => (
            <GlassCard key={f.title} hoverable style={{ animationDelay: '0.1s' }}>
              <div style={{
                fontSize: 24,
                marginBottom: 16,
                color: 'var(--ou-accent)',
              }}>
                {f.icon}
              </div>
              <h3 style={{
                fontSize: 'var(--ou-text-base)',
                fontWeight: 600,
                color: 'var(--ou-text-heading)',
                marginBottom: 8,
                letterSpacing: '-0.02em',
              }}>
                {f.title}
              </h3>
              <p style={{
                fontSize: 'var(--ou-text-sm)',
                color: 'var(--ou-text-secondary)',
                lineHeight: 1.6,
              }}>
                {f.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 인터랙티브 데모 */}
      <DemoSection />

      {/* 푸터 */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        borderTop: '1px solid var(--ou-glass-border)',
        display: 'flex',
        gap: 24,
        justifyContent: 'center',
      }}>
        {[
          { label: 'Privacy', href: '/privacy' },
          { label: 'Terms', href: '/terms' },
        ].map(({ label, href }) => (
          <Link key={href} href={href} style={{
            fontSize: 'var(--ou-text-sm)',
            color: 'var(--ou-text-muted)',
            transition: 'color var(--ou-transition-fast)',
          }}>
            {label}
          </Link>
        ))}
      </footer>
    </PageLayout>
  );
}
