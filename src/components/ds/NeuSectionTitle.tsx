'use client';
import { CSSProperties, ReactNode } from 'react';

interface NeuSectionTitleProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function NeuSectionTitle({ children, style }: NeuSectionTitleProps) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 3,
      textTransform: 'uppercase' as const,
      color: 'var(--ou-text-muted)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
      ...style,
    }}>
      {children}
      <div style={{ flex: 1, height: 1, background: 'var(--ou-text-disabled)' }} />
    </div>
  );
}
