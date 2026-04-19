'use client';
import { CSSProperties } from 'react';

interface NeuNotificationBadgeProps {
  count: number;
  style?: CSSProperties;
}

export function NeuNotificationBadge({ count, style }: NeuNotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <div style={{
      background: 'var(--ou-accent)',
      color: '#fff',
      fontSize: 9,
      fontWeight: 700,
      minWidth: 18,
      height: 18,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
      ...style,
    }}>
      {count > 99 ? '99+' : count}
    </div>
  );
}
