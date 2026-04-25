'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { OuLogo } from '@/components/ds';

const GraphCanvas = dynamic(
  () => import('@/components/landing/GraphCanvas').then(m => ({ default: m.GraphCanvas })),
  { ssr: false, loading: () => null }
);

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', overflow: 'hidden' }}>

      {/* 좌측 60% — 회전 도트 구 */}
      <div style={{
        flex: '0 0 60%',
        position: 'relative',
        height: '100vh',
      }}>
        <GraphCanvas />
        <div style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width: 120,
          background: 'linear-gradient(to right, transparent, #0a0a0f)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* 우측 40% — 로고 + CTA */}
      <div style={{
        flex: '0 0 40%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 40px',
        gap: 16,
        minHeight: '100vh',
      }}>
        {/* 로고 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
          <OuLogo width={58} color="rgba(255,255,255,0.95)" />
          <span style={{
            fontSize: 10,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.14em',
            textTransform: 'lowercase',
          }}>
            own universe
          </span>
        </div>

        {/* 카피 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <h1 style={{
            fontSize: 'clamp(18px, 2vw, 26px)',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            fontFamily: 'var(--ou-font-logo)',
            textAlign: 'center',
          }}>
            Just talk.
          </h1>
          <p style={{
            fontSize: 'clamp(9px, 1vw, 11px)',
            color: 'rgba(255,255,255,0.40)',
            lineHeight: 1.5,
            textAlign: 'center',
          }}>
            대화로 만드는 나만의 우주
          </p>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          <Link href="/login">
            <button style={{
              height: 30,
              padding: '0 18px',
              background: 'rgba(255,255,255,0.95)',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: 15,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--ou-font-logo)',
              cursor: 'pointer',
              transition: 'all 160ms ease',
              letterSpacing: '0.04em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,255,255,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Log in
            </button>
          </Link>
          <Link href="/login?tab=signup">
            <button style={{
              height: 30,
              padding: '0 18px',
              background: 'transparent',
              color: 'rgba(255,255,255,0.85)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: 15,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--ou-font-logo)',
              cursor: 'pointer',
              transition: 'all 160ms ease',
              letterSpacing: '0.04em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
            >
              sign up
            </button>
          </Link>
        </div>

        {/* 하단 링크 */}
        <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16 }}>
          {[{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }].map(({ label, href }) => (
            <Link key={href} href={href} style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.06em' }}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
