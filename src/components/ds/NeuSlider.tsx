'use client';
import { CSSProperties } from 'react';

interface NeuSliderProps {
  value: number; // 0-100
  onChange?: (value: number) => void;
  style?: CSSProperties;
}

export function NeuSlider({ value, onChange, style }: NeuSliderProps) {
  const trackStyle: CSSProperties = {
    width: '100%',
    height: 6,
    borderRadius: 'var(--ou-radius-pill)',
    background: 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-pressed-sm)',
    position: 'relative' as const,
    cursor: 'pointer',
    ...style,
  };

  const fillStyle: CSSProperties = {
    height: '100%',
    width: `${value}%`,
    borderRadius: 'var(--ou-radius-pill)',
    background: 'linear-gradient(90deg, var(--ou-accent), var(--ou-accent-secondary))',
  };

  const thumbStyle: CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-raised-md)',
    position: 'absolute' as const,
    top: '50%',
    left: `${value}%`,
    transform: 'translate(-50%, -50%)',
    cursor: 'grab',
    transition: 'box-shadow var(--ou-transition)',
  };

  return (
    <div style={trackStyle}>
      <div style={fillStyle} />
      <div style={thumbStyle} />
    </div>
  );
}
