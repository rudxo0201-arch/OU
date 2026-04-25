'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const GraphCanvas = dynamic(
  () => import('@/components/landing/GraphCanvas').then(m => ({ default: m.GraphCanvas })),
  { ssr: false, loading: () => null }
);

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', overflow: 'hidden' }}>

      {/* 좌측 55% — 회전 도트 구 */}
      <div style={{
        flex: '0 0 55%',
        position: 'relative',
        height: '100vh',
      }}>
        <GraphCanvas />
        {/* 우측 그라디언트 페이드 */}
        <div style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width: 160,
          background: 'linear-gradient(to right, transparent, #0a0a0f)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* 중앙 그라디언트 구분선 */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: 1,
        background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent)',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }} />

      {/* 우측 42% — 로고 + CTA */}
      <div style={{
        flex: '0 0 42%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '0 48px 0 40px',
        gap: 28,
        minHeight: '100vh',
      }}>
        {/* 로고 */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <img src="/assets/ou-logo.svg" alt="OU" style={{ height: 56, display: 'block' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
              }}
            />
            <span style={{
              display: 'none',
              fontFamily: 'var(--ou-font-logo)',
              fontSize: 52,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.95)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}>OU</span>
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.14em',
            textTransform: 'lowercase',
            display: 'block',
          }}>
            own universe
          </span>
        </div>

        {/* 카피 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h1 style={{
            fontSize: 'clamp(28px, 3.5vw, 42px)',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            fontFamily: 'var(--ou-font-display)',
          }}>
            Just talk.
          </h1>
          <p style={{
            fontSize: 'clamp(13px, 1.5vw, 15px)',
            color: 'rgba(255,255,255,0.40)',
            lineHeight: 1.5,
          }}>
            대화로 만드는 나만의 우주
          </p>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/login">
            <button style={{
              height: 40,
              padding: '0 22px',
              background: 'none',
              color: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 160ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.55)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            >
              Log in
            </button>
          </Link>
          <Link href="/login?tab=signup">
            <button style={{
              height: 40,
              padding: '0 22px',
              background: 'rgba(255,255,255,0.95)',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 160ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              sign up
            </button>
          </Link>
        </div>

        {/* 하단 링크 */}
        <div style={{ marginTop: 'auto', paddingTop: 40, display: 'flex', gap: 20 }}>
          {[{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }].map(({ label, href }) => (
            <Link key={href} href={href} style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.06em' }}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
