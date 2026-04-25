'use client';
import { CSSProperties, ReactNode } from 'react';

interface OuBadgeProps {
  children: ReactNode;
  accent?: boolean;
  style?: CSSProperties;
}

export function OuBadge({ children, accent = false, style }: OuBadgeProps) {
  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 'var(--ou-radius-pill)',
    fontSize: 10,
    fontWeight: 700,
    background: 'var(--ou-surface-faint)',
    border: '1px solid var(--ou-border-subtle)',
    color: accent ? 'var(--ou-accent)' : 'var(--ou-text-secondary)',
    letterSpacing: 0.3,
    ...style,
  };

  return <span style={badgeStyle}>{children}</span>;
}
