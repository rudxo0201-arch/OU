'use client';
import { CSSProperties } from 'react';

interface NeuCheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

export function NeuCheckbox({ checked, onChange, label, disabled = false, size = 'md', style }: NeuCheckboxProps) {
  const sizeVal = size === 'sm' ? 18 : 22;
  const fontSize = size === 'sm' ? 10 : 13;

  const boxStyle: CSSProperties = {
    width: sizeVal,
    height: sizeVal,
    borderRadius: 4,
    background: 'var(--ou-bg)',
    boxShadow: checked ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize,
    color: checked ? 'var(--ou-accent)' : 'transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all var(--ou-transition)',
    flexShrink: 0,
  };

  const labelStyle: CSSProperties = {
    fontSize: size === 'sm' ? 12 : 13,
    color: checked ? 'var(--ou-text-muted)' : 'var(--ou-text-body)',
    textDecoration: checked ? 'line-through' : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? 8 : 10, ...style }}
      onClick={() => !disabled && onChange?.(!checked)}
    >
      <div style={boxStyle}>{'\u2713'}</div>
      {label && <span style={labelStyle}>{label}</span>}
    </div>
  );
}
