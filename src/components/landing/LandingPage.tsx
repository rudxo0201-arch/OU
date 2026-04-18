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
      {/* DotSphere 배경 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        opacity: 0.7,
      }}>
        <DotSphere />
      </div>

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

      {/* Hero — 구체 위에 오버레이 */}
      <div style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 24,
        pointerEvents: 'none',
      }}>
        <img src="/logo-ou-white.svg" alt="OU" style={{
          height: 64,
          filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.25)) drop-shadow(0 0 60px rgba(255,255,255,0.1))',
        }} />

        <span style={{
          fontFamily: "var(--font-orbitron, 'Orbitron')",
          fontSize: 9, color: 'rgba(255,255,255,0.25)',
          letterSpacing: 6, textTransform: 'uppercase' as const,
        }}>
          OWN UNIVERSE
        </span>

        <span style={{
          fontSize: 42, fontWeight: 200,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: 2,
        }}>
          Just talk.
        </span>

        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.4)',
          maxWidth: 400, textAlign: 'center', lineHeight: 1.8,
          fontWeight: 300,
        }}>
          말하면 데이터가 됩니다.
          <br />
          어떤 형태로든 꺼내 쓰세요.
        </p>

        <button
          onClick={() => router.push('/login?tab=signup')}
          style={{
            marginTop: 12, padding: '14px 48px', borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(8px)',
            color: '#fff', fontSize: 15, fontWeight: 500, letterSpacing: 1,
            boxShadow: '0 0 30px rgba(255,255,255,0.06)',
            cursor: 'pointer',
            pointerEvents: 'auto',
            transition: '200ms ease',
          }}
        >
          시작하기
        </button>
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
