'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { OuLogo } from '@/components/ds';

const DotSphere = dynamic(() => import('./DotSphere').then(m => ({ default: m.DotSphere })), { ssr: false });

export function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleNav = (path: string) => {
    setLoading(true);
    router.push(path);
  };

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 좌우 분할 레이아웃 */}
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
      }}>
        {/* 좌: DotSphere */}
        <div style={{
          width: '50%',
          height: '100vh',
          position: 'relative',
        }}>
          <DotSphere />
        </div>

        {/* 우: 로고 + 카피 + CTA (중앙 정렬) */}
        <div style={{
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 38,
        }}>
          {/* 로고 + 브랜드 그룹 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <OuLogo width={120} color="var(--ou-text-heading)" />
            <span style={{
              fontSize: 11,
              fontFamily: 'var(--ou-font-body)',
              color: 'var(--ou-text-muted)',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}>
              own universe
            </span>
          </div>

          {/* 메인 카피 + 서브카피 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <h1 style={{
              fontFamily: "var(--font-orbitron, 'Orbitron')",
              fontSize: 38, fontWeight: 600,
              color: 'var(--ou-text-bright)',
              margin: 0,
            }}>
              Just talk.
            </h1>
            <p style={{
              fontSize: 17, color: 'var(--ou-text-muted)',
              margin: 0,
            }}>
              대화로 만드는 나만의 우주
            </p>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 14 }}>
            <button
              onClick={() => handleNav('/login')}
              style={{
                fontFamily: "var(--font-orbitron, 'Orbitron')",
                padding: '14px 43px', borderRadius: 999,
                border: '1px solid var(--ou-border-muted)',
                background: 'transparent',
                color: 'var(--ou-text-body)', fontSize: 17, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Log in
            </button>
            <button
              onClick={() => handleNav('/login?tab=signup')}
              style={{
                fontFamily: "var(--font-orbitron, 'Orbitron')",
                padding: '14px 43px', borderRadius: 999,
                background: 'var(--ou-text-strong)',
                color: 'var(--ou-bg)', fontSize: 17, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              sign up
            </button>
          </div>
        </div>
      </div>

      {/* 로딩 오버레이 */}
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'var(--ou-bg)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 24,
        }}>
          <OuLogo
            width={96}
            color="var(--ou-text-heading)"
            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
          />
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
