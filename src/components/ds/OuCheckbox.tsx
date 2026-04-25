'use client';
import { CSSProperties } from 'react';

interface OuCheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

export function OuCheckbox({ checked, onChange, label, disabled = false, size = 'md', style }: OuCheckboxProps) {
  const sizeVal = size === 'sm' ? 18 : 22;
  const fontSize = size === 'sm' ? 11 : 13;

  const boxStyle: CSSProperties = {
    width: sizeVal,
    height: sizeVal,
    borderRadius: 4,
    background: checked ? 'var(--ou-text-heading)' : 'transparent',
    border: `1.5px solid ${checked ? 'var(--ou-text-heading)' : 'var(--ou-border-mid)'}`,
    boxShadow: checked ? 'var(--ou-glow-sm)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize,
    // checked: bg color text (contrast). unchecked: transparent
    color: checked ? 'var(--ou-bg)' : 'transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
    flexShrink: 0,
    lineHeight: 1,
  };

  const labelStyle: CSSProperties = {
    fontSize: size === 'sm' ? 12 : 13,
    color: checked ? 'var(--ou-text-muted)' : 'var(--ou-text-body)',
    textDecoration: checked ? 'line-through' : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    transition: 'color 150ms ease',
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? 8 : 10, ...style }}
      onClick={() => !disabled && onChange?.(!checked)}
    >
      <div style={boxStyle}>✓</div>
      {label && <span style={labelStyle}>{label}</span>}
    </div>
  );
}
