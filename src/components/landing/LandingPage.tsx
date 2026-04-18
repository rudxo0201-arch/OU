'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const DotSphere = dynamic(() => import('./DotSphere').then(m => ({ default: m.DotSphere })), { ssr: false });

export function LandingPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-ou-white.svg" alt="OU" style={{ height: 22, filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' }} />
          <span style={{
            padding: '2px 8px', borderRadius: 999,
            border: '0.5px solid rgba(255,255,255,0.15)',
            fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1,
          }}>Beta</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '8px 20px', borderRadius: 999,
              border: '0.5px solid rgba(255,255,255,0.1)',
              fontSize: 13, color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            Log in
          </button>
          <button
            onClick={() => router.push('/login?tab=signup')}
            style={{
              padding: '8px 20px', borderRadius: 999,
              background: 'rgba(255,255,255,0.9)',
              color: '#111', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign up
          </button>
        </div>
      </nav>

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

        {/* 우: 카피 + CTA */}
        <div style={{
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 60px',
          gap: 20,
        }}>
          <span style={{
            fontFamily: "var(--font-orbitron, 'Orbitron')",
            fontSize: 9, color: 'rgba(255,255,255,0.25)',
            letterSpacing: 6, textTransform: 'uppercase' as const,
          }}>
            OWN UNIVERSE
          </span>

          <h1 style={{
            fontSize: 40, fontWeight: 200,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.4,
            margin: 0,
          }}>
            대화로 만드는
            <br />
            나만의 우주
          </h1>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button
              onClick={() => router.push('/login?tab=signup')}
              style={{
                padding: '14px 40px', borderRadius: 999,
                background: 'rgba(255,255,255,0.9)',
                color: '#111', fontSize: 15, fontWeight: 600,
                cursor: 'pointer',
                transition: '200ms ease',
              }}
            >
              시작하기
            </button>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '14px 32px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)', fontSize: 15,
                cursor: 'pointer',
                transition: '200ms ease',
              }}
            >
              로그인
            </button>
          </div>
        </div>
      </div>

      <footer style={{
        position: 'fixed', bottom: 16, left: 0, right: 0,
        textAlign: 'center',
        fontSize: 11, color: 'rgba(255,255,255,0.1)',
        zIndex: 1,
      }}>
        ouuniverse.com
      </footer>
    </div>
  );
}
