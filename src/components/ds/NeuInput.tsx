'use client';
import { CSSProperties, InputHTMLAttributes, forwardRef } from 'react';

interface NeuInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const NeuInput = forwardRef<HTMLInputElement, NeuInputProps>(
  ({ label, size = 'md', style, className, ...props }, ref) => {
    const paddingMap = { sm: '8px 12px', md: '12px 16px', lg: '16px 20px' };
    const fontMap = { sm: 12, md: 14, lg: 16 };

    const inputStyle: CSSProperties = {
      background: 'var(--ou-bg)',
      borderRadius: 'var(--ou-radius-sm)',
      boxShadow: 'var(--ou-neu-pressed-md)',
      padding: paddingMap[size],
      fontSize: fontMap[size],
      color: 'var(--ou-text-strong)',
      width: '100%',
      border: 'none',
      outline: 'none',
      fontFamily: 'inherit',
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
        <input ref={ref} style={inputStyle} {...props} />
      </div>
    );
  }
);
NeuInput.displayName = 'NeuInput';
