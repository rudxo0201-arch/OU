'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

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
            <img
              src="/logo-ou-white.svg"
              alt="OU"
              style={{ height: 86, filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3)) drop-shadow(0 0 40px rgba(255,255,255,0.15))' }}
            />
            <span style={{
              fontFamily: "var(--font-orbitron, 'Orbitron')",
              fontSize: 13, color: 'rgba(255,255,255,0.5)',
              letterSpacing: 5,
            }}>
              own universe
            </span>
          </div>

          {/* 메인 카피 + 서브카피 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <h1 style={{
              fontFamily: "var(--font-orbitron, 'Orbitron')",
              fontSize: 38, fontWeight: 600,
              color: 'rgba(255,255,255,0.95)',
              margin: 0,
            }}>
              Just talk.
            </h1>
            <p style={{
              fontSize: 17, color: 'rgba(255,255,255,0.35)',
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
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)', fontSize: 17, fontWeight: 500,
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
                background: 'rgba(255,255,255,0.9)',
                color: '#111', fontSize: 17, fontWeight: 500,
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
          background: '#060810',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 24,
        }}>
          <img
            src="/logo-ou-white.svg"
            alt="OU"
            style={{
              height: 48,
              filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
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
