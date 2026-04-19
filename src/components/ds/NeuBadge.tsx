'use client';
import { CSSProperties, ReactNode } from 'react';

interface NeuBadgeProps {
  children: ReactNode;
  accent?: boolean;
  style?: CSSProperties;
}

export function NeuBadge({ children, accent = false, style }: NeuBadgeProps) {
  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 'var(--ou-radius-pill)',
    fontSize: 10,
    fontWeight: 700,
    background: 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-raised-xs)',
    color: accent ? 'var(--ou-accent)' : 'var(--ou-text-secondary)',
    letterSpacing: 0.3,
    ...style,
  };

  return <span style={badgeStyle}>{children}</span>;
}
