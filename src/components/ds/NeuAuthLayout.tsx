'use client';
import { CSSProperties, ReactNode } from 'react';
import { OuLogo } from './OuLogo';

interface NeuAuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  maxWidth?: number;
  style?: CSSProperties;
}

export function NeuAuthLayout({ children, title, maxWidth = 420, style }: NeuAuthLayoutProps) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--ou-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
    }}>
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth,
        padding: '40px 36px',
        borderRadius: 24,
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-raised-lg)',
        display: 'flex', flexDirection: 'column', gap: 22,
        ...style,
      }}>
        {/* Orb mark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingBottom: 2 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Inner pressed ring */}
            <div style={{
              position: 'absolute', inset: 8, borderRadius: '50%',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
            }} />
            {/* Accent core */}
            <div style={{
              position: 'relative', width: 8, height: 8, borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, var(--ou-accent-secondary), var(--ou-accent) 70%)',
              boxShadow: '0 0 10px 2px color-mix(in srgb, var(--ou-accent) 50%, transparent)',
              zIndex: 1,
            }} />
          </div>
          <OuLogo width={56} color="var(--ou-text-bright)" />
        </div>

        {title && (
          <div style={{
            fontSize: 18, fontWeight: 700,
            color: 'var(--ou-text-bright)',
            letterSpacing: '-0.01em',
            textAlign: 'center',
          }}>
            {title}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
