'use client';

import Link from 'next/link';
import { CSSProperties } from 'react';
import { PageLayout, GlassCard, GlassButton } from '@/components/ds';

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
        background: 'rgba(11,11,17,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '80px 24px 64px',
        textAlign: 'center',
      }}>
        {/* OU 로고 오브 */}
        <div style={{
          position: 'relative',
          marginBottom: 40,
        }}>
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
              textShadow: `0 0 32px rgba(var(--ou-accent-rgb), 0.6)`,
            }}>
              OU
            </span>
          </div>
          {/* 글로우 링 */}
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
          fontSize: 'clamp(40px, 8vw, 72px)',
          fontWeight: 700,
          color: 'var(--ou-text-heading)',
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
          marginBottom: 20,
        }}>
          Just talk.
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          color: 'var(--ou-text-secondary)',
          lineHeight: 1.5,
          maxWidth: 480,
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
