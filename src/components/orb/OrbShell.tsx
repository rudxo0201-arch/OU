'use client';

import { CSSProperties, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AmbientBackground } from '@/components/ds';

interface OrbShellProps {
  slug: string;
  title: string;
  icon: string;
  children: ReactNode;
}

/**
 * Orb 전체화면 셸.
 * 글래스 네비바(Orb 이름 + 닫기) + 콘텐츠 영역.
 */
export function OrbShell({ slug, title, icon, children }: OrbShellProps) {
  const router = useRouter();
  const [closeHovered, setCloseHovered] = useState(false);

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: 'var(--ou-space)',
    }}>
      <AmbientBackground />

      {/* Orb 헤더 */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        background: 'rgba(228,228,234,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--ou-glass-border)',
      }}>
        {/* 뒤로가기 */}
        <button
          onClick={() => router.push('/home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 'var(--ou-radius-sm)',
            background: 'none',
            border: 'none',
            color: 'var(--ou-text-secondary)',
            fontSize: 18,
            cursor: 'pointer',
            transition: 'color var(--ou-transition-fast)',
            marginRight: 12,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ou-text-heading)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ou-text-secondary)')}
        >
          ←
        </button>

        {/* Orb 이름 */}
        <span style={{ fontSize: 18, marginRight: 8 }}>{icon}</span>
        <span style={{
          fontSize: 'var(--ou-text-sm)',
          fontWeight: 600,
          color: 'var(--ou-text-heading)',
          letterSpacing: '-0.01em',
        }}>
          {title}
        </span>

        {/* 닫기 */}
        <button
          onClick={() => router.push('/home')}
          onMouseEnter={() => setCloseHovered(true)}
          onMouseLeave={() => setCloseHovered(false)}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 'var(--ou-radius-sm)',
            background: closeHovered ? 'var(--ou-glass-hover)' : 'transparent',
            border: 'none',
            color: closeHovered ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
            fontSize: 16,
            cursor: 'pointer',
            transition: 'all var(--ou-transition-fast)',
          }}
        >
          ✕
        </button>
      </header>

      {/* 콘텐츠 */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        paddingTop: 52,
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  );
}
