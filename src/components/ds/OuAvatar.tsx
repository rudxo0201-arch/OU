'use client';

import { CSSProperties } from 'react';

export interface OuAvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  glow?: boolean;
  style?: CSSProperties;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function OuAvatar({ src, name = '', size = 36, glow = false, style }: OuAvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--ou-surface)',
        border: `1px solid ${glow ? 'rgba(var(--ou-accent-rgb), 0.4)' : 'var(--ou-glass-border-hover)'}`,
        boxShadow: glow ? 'var(--ou-shadow-md)' : 'var(--ou-shadow-sm)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        color: glow ? 'var(--ou-accent)' : 'var(--ou-text-secondary)',
        flexShrink: 0,
        ...style,
      }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        getInitials(name) || '?'
      )}
    </div>
  );
}
