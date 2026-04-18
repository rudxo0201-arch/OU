'use client';

import { useRouter } from 'next/navigation';

export function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-ou-white.svg" alt="OU" style={{ height: 22, filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' }} />
          <span style={{ padding: '2px 8px', borderRadius: 999, border: '0.5px solid rgba(255,255,255,0.15)', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>Beta</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => router.push('/login')} style={{ padding: '8px 20px', borderRadius: 999, border: '0.5px solid rgba(255,255,255,0.1)', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Log in</button>
          <button onClick={() => router.push('/login?tab=signup')} style={{ padding: '8px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.9)', color: '#111', fontSize: 13, fontWeight: 600 }}>Sign up</button>
        </div>
      </nav>

      {/* Hero */}
      <img src="/logo-ou-white.svg" alt="OU" style={{
        height: 80,
        filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.2)) drop-shadow(0 0 60px rgba(255,255,255,0.1))',
      }} />
      <span style={{ fontFamily: "var(--font-orbitron, 'Orbitron')", fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 6, textTransform: 'uppercase' as const }}>OWN UNIVERSE</span>
      <span style={{ fontSize: 36, fontWeight: 300, color: 'rgba(255,255,255,0.8)' }}>Just talk.</span>

      <button onClick={() => router.push('/login?tab=signup')} style={{
        marginTop: 24, padding: '14px 48px', borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.7)', background: 'transparent',
        color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: 1,
        boxShadow: '0 0 20px rgba(255,255,255,0.08)',
      }}>시작하기</button>

      <footer style={{ position: 'fixed', bottom: 16, fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>ouuniverse.com</footer>
    </div>
  );
}
