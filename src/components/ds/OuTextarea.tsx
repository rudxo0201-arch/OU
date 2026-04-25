'use client';
import { CSSProperties, TextareaHTMLAttributes, forwardRef } from 'react';

interface OuTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const OuTextarea = forwardRef<HTMLTextAreaElement, OuTextareaProps>(
  ({ label, style, className, ...props }, ref) => {
    const textareaStyle: CSSProperties = {
      background: 'var(--ou-bg)',
      borderRadius: 'var(--ou-radius-sm)',
      boxShadow: 'var(--ou-neu-pressed-md)',
      padding: '12px 16px',
      fontSize: 14,
      color: 'var(--ou-text-strong)',
      width: '100%',
      border: 'none',
      outline: 'none',
      fontFamily: 'inherit',
      resize: 'vertical',
      minHeight: 80,
      lineHeight: 1.6,
      transition: 'all var(--ou-transition)',
      ...style,
    };

    return (
      <div className={className}>
        {label && (
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-muted)', letterSpacing: 0.5, marginBottom: 6 }}>
            {label}
          </div>
        )}
        <textarea ref={ref} style={textareaStyle} {...props} />
      </div>
    );
  }
);
OuTextarea.displayName = 'OuTextarea';
