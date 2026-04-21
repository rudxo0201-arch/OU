import { CSSProperties, ReactNode } from 'react';
import { AmbientBackground } from './AmbientBackground';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: 'var(--ou-space)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <AmbientBackground variant="auth" />

      {/* OU 로고 */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        marginBottom: 40,
        textAlign: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--ou-text-heading)',
          letterSpacing: '-0.02em',
          textShadow: 'var(--ou-accent-glow)',
        }}>
          OU
        </span>
      </div>

      {/* 콘텐츠 */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        {children}
      </div>
    </div>
  );
}
