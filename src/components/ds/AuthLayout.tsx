import { CSSProperties, ReactNode } from 'react';
import { AmbientBackground } from './AmbientBackground';
import { OuLogo } from './OuLogo';

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
        <OuLogo width={72} color="var(--ou-text-heading)" />
      </div>

      {/* 콘텐츠 */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        {children}
      </div>
    </div>
  );
}
