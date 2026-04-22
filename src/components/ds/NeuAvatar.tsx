'use client';
import { CSSProperties, ReactNode } from 'react';

interface NeuAvatarProps {
  children: ReactNode; // letter or icon
  size?: 'sm' | 'md' | 'lg';
  accent?: boolean;
  style?: CSSProperties;
}

export function NeuAvatar({ children, size = 'md', accent = false, style }: NeuAvatarProps) {
  const sizeMap = { sm: 28, md: 44, lg: 64 };
  const fontMap = { sm: 10, md: 16, lg: 24 };

  const avatarStyle: CSSProperties = {
    width: sizeMap[size],
    height: sizeMap[size],
    borderRadius: '50%',
    background: accent ? 'linear-gradient(135deg, var(--ou-accent), var(--ou-accent-secondary))' : 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-raised-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: fontMap[size],
    fontWeight: 700,
    color: accent ? '#fff' : 'var(--ou-accent)',
    flexShrink: 0,
    ...style,
  };

  return <div style={avatarStyle}>{children}</div>;
}
