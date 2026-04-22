'use client';

import { CSSProperties, InputHTMLAttributes, ReactNode, useState } from 'react';

interface GlassInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  containerStyle?: CSSProperties;
}

export function GlassInput({
  label,
  error,
  prefix,
  suffix,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: GlassInputProps) {
  const [focused, setFocused] = useState(false);

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--ou-space-2)',
    ...containerStyle,
  };

  const fieldStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ou-space-2)',
    height: 44,
    padding: '0 14px',
    background: focused ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.70)',
    backdropFilter: 'var(--ou-blur-light)',
    WebkitBackdropFilter: 'var(--ou-blur-light)',
    border: `1px solid ${error ? 'rgba(248,113,113,0.4)' : focused ? 'var(--ou-glass-border-focus)' : 'var(--ou-glass-border)'}`,
    borderRadius: 'var(--ou-radius-sm)',
    boxShadow: focused ? `0 0 0 3px rgba(var(--ou-accent-rgb), 0.1)` : 'none',
    transition: 'background var(--ou-transition-fast), border-color var(--ou-transition-fast), box-shadow var(--ou-transition-fast)',
  };

  const inputStyle: CSSProperties = {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--ou-text-heading)',
    fontSize: 'var(--ou-text-base)',
    fontFamily: 'var(--ou-font-body)',
    ...style,
  };

  return (
    <div style={wrapperStyle}>
      {label && (
        <label style={{
          fontSize: 'var(--ou-text-sm)',
          color: 'var(--ou-text-secondary)',
          fontWeight: 500,
        }}>
          {label}
        </label>
      )}
      <div style={fieldStyle}>
        {prefix && (
          <span style={{ color: 'var(--ou-text-muted)', display: 'flex', flexShrink: 0 }}>
            {prefix}
          </span>
        )}
        <input
          {...rest}
          style={inputStyle}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        />
        {suffix && (
          <span style={{ color: 'var(--ou-text-muted)', display: 'flex', flexShrink: 0 }}>
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span style={{ fontSize: 'var(--ou-text-xs)', color: 'var(--ou-error)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
