'use client';
import { CSSProperties, ReactNode } from 'react';

interface OuCircleDisplayProps {
  value: ReactNode;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  accentGlow?: boolean;
  style?: CSSProperties;
}

export function OuCircleDisplay({ value, label, size = 'md', accentGlow = true, style }: OuCircleDisplayProps) {
  const sizeMap = { sm: 100, md: 140, lg: 180 };
  const fontMap = { sm: 24, md: 36, lg: 48 };

  const circleStyle: CSSProperties = {
    width: sizeMap[size],
    height: sizeMap[size],
    borderRadius: '50%',
    background: 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-raised-lg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column' as const,
    position: 'relative' as const,
    ...style,
  };

  return (
    <div style={circleStyle}>
      <div style={{ fontFamily: 'var(--ou-font-display)', fontSize: fontMap[size], fontWeight: 300, color: 'var(--ou-text-heading)', letterSpacing: -1 }}>
        {value}
      </div>
      {label && (
        <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 2 }}>{label}</div>
      )}
    </div>
  );
}
