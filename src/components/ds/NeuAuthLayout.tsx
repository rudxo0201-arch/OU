'use client';
import { CSSProperties, ReactNode } from 'react';
import { NeuCard } from './NeuCard';

interface NeuAuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  maxWidth?: number;
  style?: CSSProperties;
}

export function NeuAuthLayout({ children, title, subtitle, maxWidth = 420, style }: NeuAuthLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--ou-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      {/* OU 로고 */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-orbitron), Orbitron, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--ou-text-heading)',
            letterSpacing: '0.08em',
          }}
        >
          OU
        </div>
        {subtitle && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ou-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <NeuCard
        variant="raised"
        size="lg"
        style={{
          width: '100%',
          maxWidth,
          ...style,
        }}
      >
        {title && (
          <h2
            style={{
              margin: '0 0 20px',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ou-text-heading)',
              letterSpacing: '-0.3px',
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </NeuCard>
    </div>
  );
}
