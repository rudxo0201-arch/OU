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
    width: 50,
    height: 26,
    borderRadius: 'var(--ou-radius-pill)',
    background: checked ? 'linear-gradient(135deg, var(--ou-accent), var(--ou-accent-secondary))' : 'var(--ou-bg)',
    boxShadow: checked
      ? 'var(--ou-neu-pressed-sm), 0 0 10px 2px color-mix(in srgb, var(--ou-accent) 25%, transparent)'
      : 'var(--ou-neu-pressed-sm)',
    position: 'relative' as const,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.3s ease',
  };

  const knobStyle: CSSProperties = {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: checked ? '#fff' : 'var(--ou-bg)',
    boxShadow: checked ? '0 1px 3px rgba(0,0,0,0.15)' : 'var(--ou-neu-raised-sm)',
    position: 'absolute' as const,
    top: 3,
    left: checked ? 27 : 3,
    transition: 'all 0.3s ease',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={trackStyle} onClick={() => !disabled && onChange?.(!checked)}>
        <div style={knobStyle} />
      </div>
      {label && <span style={{ fontSize: 12, color: 'var(--ou-text-secondary)' }}>{label}</span>}
    </div>
  );
}
