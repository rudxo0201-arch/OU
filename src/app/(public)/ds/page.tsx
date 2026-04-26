'use client';

/**
 * /ds — OU Design System (React 이식 1차)
 *
 * 시각 명세 원본: public/design-system-preview.html (59 sections)
 * 이번 세션 이식: 11/59 (Tokens 4 + Typography 1 + Blocks 6)
 * 잔여 섹션은 /design-system-preview.html 직접 접근 가능.
 *
 * 등록 절차: src/components/ds/GOVERNANCE.md
 * 컴포넌트 메타: src/components/ds/registry.ts
 */

import { useState } from 'react';
import { StarField } from '@/components/layout/StarField';
import { TokensSections } from './sections/Tokens';
import { TypographySection } from './sections/Typography';
import { BlocksSections } from './sections/Blocks';

export default function DsPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  return (
    <div data-theme={theme} style={{
      minHeight: '100vh',
      background: 'var(--ou-bg)',
      color: 'var(--ou-text-body)',
      fontFamily: 'var(--ou-font-body)',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      <StarField />

      <ThemeToggle theme={theme} onToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 1200,
        margin: '0 auto',
        padding: '120px 24px 200px',
      }}>
        <PageHeader />
        <Philosophy />
        <TokensSections />
        <TypographySection />
        <BlocksSections />
        <Footer />
      </div>
    </div>
  );
}

// ── Theme Toggle ──────────────────────────────────────────────────────────────

function ThemeToggle({ theme, onToggle }: { theme: 'dark' | 'light'; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 'var(--ou-radius-pill)',
        border: '0.5px solid var(--ou-border-subtle)',
        background: 'transparent',
        boxShadow: 'var(--ou-glow-sm)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 11,
        color: 'var(--ou-text-secondary)',
        transition: 'var(--ou-transition)',
      }}
    >
      <span>{theme === 'dark' ? '🌑' : '☀️'}</span>
      <span style={{ textTransform: 'capitalize' }}>{theme}</span>
    </button>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <>
      <div style={{
        fontFamily: 'var(--ou-font-logo)',
        fontSize: 36,
        fontWeight: 500,
        color: 'var(--ou-text-bright)',
        textAlign: 'center',
        marginBottom: 8,
        textShadow: '0 0 40px rgba(255,255,255,0.15)',
        letterSpacing: '0.02em',
      }}>
        OU
      </div>
      <div style={{
        fontFamily: 'var(--ou-font-logo)',
        fontSize: 9,
        fontWeight: 400,
        color: 'rgba(255,255,255,0.35)',
        letterSpacing: '6px',
        textTransform: 'uppercase',
        textAlign: 'center',
        marginBottom: 56,
      }}>
        Design System &mdash; Floating in Space
      </div>
    </>
  );
}

// ── Philosophy ────────────────────────────────────────────────────────────────

function Philosophy() {
  return (
    <div style={{
      textAlign: 'center',
      marginBottom: 80,
      padding: 32,
      border: '0.5px solid var(--ou-border-faint)',
      borderRadius: 'var(--ou-radius-card)',
      boxShadow: 'var(--ou-glow-sm)',
    }}>
      <p style={{
        fontSize: 14,
        color: 'var(--ou-text-secondary)',
        lineHeight: 1.8,
        margin: 0,
      }}>
        <strong style={{ color: 'var(--ou-text-strong)' }}>우주에 떠 있는 것들.</strong><br />
        배경색 없음. 테두리와 은은한 빛으로만 형태를 드러냄.<br />
        다크모드 = 검은 우주 &nbsp;/&nbsp; 라이트모드 = 흰 우주.
      </p>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <div style={{
      marginTop: 120,
      padding: 24,
      textAlign: 'center',
      borderTop: '0.5px solid var(--ou-border-faint)',
    }}>
      <p style={{ fontSize: 11, color: 'var(--ou-text-disabled)', margin: 0, lineHeight: 1.7 }}>
        나머지 48개 섹션(Views, UI 패턴, Layout 등)은 다음 세션에서 React로 이식합니다.<br />
        명세 원본:{' '}
        <a href="/design-system-preview.html" target="_blank" style={{ color: 'var(--ou-text-secondary)', fontFamily: 'var(--ou-font-mono)' }}>
          /design-system-preview.html
        </a>
      </p>
    </div>
  );
}
