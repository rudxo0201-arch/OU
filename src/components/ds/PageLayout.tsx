import { CSSProperties, ReactNode } from 'react';
import { AmbientBackground } from './AmbientBackground';

interface PageLayoutProps {
  children: ReactNode;
  style?: CSSProperties;
  noAmbient?: boolean;
}

export function PageLayout({ children, style, noAmbient = false }: PageLayoutProps) {
  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: 'var(--ou-space)',
    }}>
      {!noAmbient && <AmbientBackground />}
      <div style={{
        position: 'relative',
        zIndex: 1,
        ...style,
      }}>
        {children}
      </div>
    </div>
  );
}
