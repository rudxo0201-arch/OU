'use client';
import { CSSProperties } from 'react';

interface NeuProgressProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  style?: CSSProperties;
}

export function NeuProgress({ value, size = 'md', showLabel = false, style }: NeuProgressProps) {
  const heightMap = { sm: 4, md: 6, lg: 10 };

  const trackStyle: CSSProperties = {
    width: '100%',
    height: heightMap[size],
    borderRadius: 'var(--ou-radius-pill)',
    background: 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-pressed-sm)',
    overflow: 'hidden',
    ...style,
  };

  const fillStyle: CSSProperties = {
    height: '100%',
    width: `${Math.min(100, Math.max(0, value))}%`,
    borderRadius: 'var(--ou-radius-pill)',
    background: 'linear-gradient(90deg, var(--ou-accent), var(--ou-accent-secondary))',
    transition: 'width 0.6s ease',
  };

  return (
    <div>
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
      {showLabel && (
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginTop: 4 }}>
          {Math.round(value)}%
        </div>
      )}
    </div>
  );
}
