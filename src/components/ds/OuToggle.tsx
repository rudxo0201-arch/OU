'use client';
import { CSSProperties } from 'react';

interface OuToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function OuToggle({ checked, onChange, label, disabled = false }: OuToggleProps) {
  const trackStyle: CSSProperties = {
    width: 48,
    height: 26,
    borderRadius: 'var(--ou-radius-pill)',
    background: checked ? 'var(--ou-text-heading)' : 'transparent',
    border: `1.5px solid ${checked ? 'var(--ou-text-heading)' : 'var(--ou-border-mid)'}`,
    boxShadow: checked ? 'var(--ou-glow-sm)' : 'none',
    position: 'relative' as const,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
    flexShrink: 0,
  };

  const knobStyle: CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: checked ? 'var(--ou-bg)' : 'var(--ou-text-secondary)',
    position: 'absolute' as const,
    top: 3,
    left: checked ? 25 : 3,
    transition: 'left 200ms ease, background 200ms ease',
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'default' }}
      onClick={() => !disabled && onChange?.(!checked)}
    >
      <div style={trackStyle}>
        <div style={knobStyle} />
      </div>
      {label && (
        <span style={{ fontSize: 13, color: 'var(--ou-text-secondary)', userSelect: 'none' }}>
          {label}
        </span>
      )}
    </div>
  );
}
