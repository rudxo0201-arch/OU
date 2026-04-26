'use client';
import { CSSProperties } from 'react';

interface OuNotificationBadgeProps {
  count: number;
  style?: CSSProperties;
}

export function OuNotificationBadge({ count, style }: OuNotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: -5,
      right: -5,
      background: 'var(--ou-accent)',
      color: 'var(--ou-bg)',
      fontSize: 9,
      fontWeight: 700,
      fontFamily: 'var(--ou-font-mono)',
      minWidth: 16,
      height: 16,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 3px',
      boxShadow: 'var(--ou-glow-xs)',
      zIndex: 1,
      ...style,
    }}>
      {count > 99 ? '99+' : count}
    </div>
  );
}
