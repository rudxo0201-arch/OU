'use client';
import { CSSProperties, ReactNode } from 'react';

interface OuTagProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function OuTag({ children, style }: OuTagProps) {
  return (
    <span style={{
      display: 'inline-flex',
      padding: '2px 8px',
      borderRadius: 'var(--ou-radius-pill)',
      fontSize: 9,
      fontWeight: 600,
      background: 'var(--ou-bg)',
      boxShadow: 'var(--ou-neu-raised-xs)',
      color: 'var(--ou-text-secondary)',
      ...style,
    }}>
      {children}
    </span>
  );
}
