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
          <span style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 'clamp(48px, 6vw, 80px)',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            display: 'block',
          }}>
            OU
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            display: 'block',
            marginTop: 6,
          }}>
            Own Universe
          </span>
        </div>

        {/* 카피 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h1 style={{
            fontSize: 'clamp(22px, 3vw, 34px)',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.88)',
            letterSpacing: '-0.03em',
            lineHeight: 1.25,
          }}>
            말하면 OU가<br />알아서 정리합니다.
          </h1>
          <p style={{
            fontSize: 'clamp(13px, 1.6vw, 16px)',
            color: 'rgba(255,255,255,0.42)',
            lineHeight: 1.65,
            maxWidth: 340,
          }}>
            일정, 할일, 습관, 일기를<br />
            따로 관리할 필요 없습니다.<br />
            대화 한 줄이 데이터가 됩니다.
          </p>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login?tab=signup">
            <button style={{
              height: 44,
              padding: '0 28px',
              background: 'rgba(255,255,255,0.95)',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              transition: 'all 160ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              시작하기
            </button>
          </Link>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', transition: 'color 140ms ease' }}
            onMouseEnter={(e: any) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
          >
            로그인 →
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
