'use client';

import { CSSProperties, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from '@phosphor-icons/react';
import { ROUTES } from '@/lib/ou-registry';
import { AmbientBackground } from '@/components/ds';

interface OrbShellProps {
  slug: string;
  title: string;
  icon: string;
  subtitle?: string;
  children: ReactNode;
}

export function OrbShell({ slug, title, icon, subtitle, children }: OrbShellProps) {
  const router = useRouter();
  const [closeHovered, setCloseHovered] = useState(false);
  const [backHovered, setBackHovered] = useState(false);

  const headerHeight = subtitle ? 64 : 52;

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#0a0a0f',
    }}>
      <AmbientBackground />

      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: headerHeight,
        display: 'flex',
        alignItems: subtitle ? 'flex-start' : 'center',
        padding: subtitle ? '12px 20px 0' : '0 20px',
        background: 'var(--ou-glass)',
        borderBottom: '1px solid var(--ou-hairline-strong)',
      }}>
        {/* 뒤로가기 */}
        <button
          onClick={() => router.push(ROUTES.HOME)}
          onMouseEnter={() => setBackHovered(true)}
          onMouseLeave={() => setBackHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 'var(--ou-radius-sm)',
            background: 'none',
            border: 'none',
            color: backHovered ? 'var(--ou-text-heading)' : 'var(--ou-text-muted)',
            cursor: 'pointer',
            transition: 'color var(--ou-transition-fast)',
            marginRight: 10,
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} weight="regular" />
        </button>

        {/* 타이틀 블록 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
            <span style={{
              fontSize: 'var(--ou-text-sm)',
              fontWeight: 600,
              color: 'var(--ou-text-heading)',
              letterSpacing: '-0.01em',
            }}>
              {title}
            </span>
          </div>
          {subtitle && (
            <div style={{
              fontSize: 'var(--ou-text-micro)',
              fontFamily: 'var(--ou-font-mono)',
              color: 'var(--ou-text-muted)',
              letterSpacing: '0.04em',
              marginTop: 3,
              marginLeft: 24,
            }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* 닫기 */}
        <button
          onClick={() => router.push(ROUTES.HOME)}
          onMouseEnter={() => setCloseHovered(true)}
          onMouseLeave={() => setCloseHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 'var(--ou-radius-sm)',
            background: 'none',
            border: 'none',
            color: closeHovered ? 'var(--ou-text-heading)' : 'var(--ou-text-muted)',
            cursor: 'pointer',
            transition: 'color var(--ou-transition-fast)',
            flexShrink: 0,
          }}
        >
          <X size={15} weight="regular" />
        </button>
      </header>

      <main style={{
        position: 'relative',
        zIndex: 1,
        paddingTop: headerHeight,
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  );
}
