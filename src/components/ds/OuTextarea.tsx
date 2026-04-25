'use client';
import { CSSProperties, TextareaHTMLAttributes, forwardRef, useState } from 'react';

interface OuTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const OuTextarea = forwardRef<HTMLTextAreaElement, OuTextareaProps>(
  ({ label, error, style, className, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? 'var(--ou-error)'
      : focused
        ? 'var(--ou-border-focus)'
        : 'var(--ou-border-mid)';

    const wrapperStyle: CSSProperties = {
      background: focused ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--ou-radius-sm)',
      boxShadow: focused ? '0 0 0 3px rgba(255,255,255,0.06), var(--ou-glow-sm)' : 'none',
      transition: 'border-color var(--ou-transition-fast), box-shadow var(--ou-transition-fast), background var(--ou-transition-fast)',
      padding: '12px 14px',
    };

    const textareaStyle: CSSProperties = {
      background: 'none',
      border: 'none',
      outline: 'none',
      fontSize: 14,
      color: 'var(--ou-text-heading)',
      width: '100%',
      fontFamily: 'inherit',
      resize: 'vertical',
      minHeight: 80,
      lineHeight: 1.6,
      caretColor: 'var(--ou-text-heading)',
      display: 'block',
      ...style,
    };

    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ou-space-2)' }}>
        {label && (
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-secondary)', letterSpacing: '0.05em' }}>
            {label}
          </label>
        )}
        <div style={wrapperStyle}>
          <textarea
            ref={ref}
            style={textareaStyle}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            {...props}
          />
        </div>
        {error && (
          <span style={{ fontSize: 12, color: 'var(--ou-error)' }}>{error}</span>
        )}
      </div>
    );
  }
);
OuTextarea.displayName = 'OuTextarea';
