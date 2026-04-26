'use client';

import { CSSProperties, InputHTMLAttributes, ReactNode, forwardRef, useState } from 'react';

export interface OuInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> {
  label?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: CSSProperties;
}

const HEIGHT_MAP = { sm: 36, md: 44, lg: 52 };
const FONT_MAP   = { sm: 'var(--ou-text-xs)', md: 'var(--ou-text-sm)', lg: 'var(--ou-text-base)' };
const PAD_MAP    = { sm: '0 10px', md: '0 14px', lg: '0 18px' };

export const OuInput = forwardRef<HTMLInputElement, OuInputProps>(
  ({ label, error, prefix, suffix, size = 'md', containerStyle, style, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? 'var(--ou-error)'
      : focused
        ? 'var(--ou-border-focus)'
        : 'var(--ou-border-subtle)';

    const fieldStyle: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--ou-space-2)',
      height: HEIGHT_MAP[size],
      padding: PAD_MAP[size],
      background: focused ? 'var(--ou-surface-muted)' : 'var(--ou-surface-faint)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--ou-radius-sm)',
      boxShadow: focused ? `0 0 0 3px var(--ou-surface-subtle), var(--ou-glow-sm)` : 'none',
      transition: 'border-color var(--ou-transition-fast), box-shadow var(--ou-transition-fast), background var(--ou-transition-fast)',
    };

    const inputStyle: CSSProperties = {
      flex: 1,
      background: 'none',
      border: 'none',
      outline: 'none',
      color: 'var(--ou-text-heading)',
      fontSize: FONT_MAP[size],
      fontFamily: 'var(--ou-font-body)',
      caretColor: 'var(--ou-text-heading)',
      ...style,
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ou-space-2)', ...containerStyle }}>
        {label && (
          <label style={{
            fontSize: 'var(--ou-text-xs)',
            fontWeight: 500,
            color: 'var(--ou-text-secondary)',
            letterSpacing: 'var(--ou-tracking-wide)',
          }}>
            {label}
          </label>
        )}
        <div style={fieldStyle}>
          {prefix && <span style={{ color: 'var(--ou-text-muted)', display: 'flex', flexShrink: 0 }}>{prefix}</span>}
          <input
            ref={ref}
            {...rest}
            style={inputStyle}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          />
          {suffix && <span style={{ color: 'var(--ou-text-muted)', display: 'flex', flexShrink: 0 }}>{suffix}</span>}
        </div>
        {error && (
          <span style={{ fontSize: 'var(--ou-text-xs)', color: 'var(--ou-error)' }}>{error}</span>
        )}
      </div>
    );
  }
);
OuInput.displayName = 'OuInput';
