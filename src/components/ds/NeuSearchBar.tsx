'use client';
import { CSSProperties, InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface NeuSearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const NeuSearchBar = forwardRef<HTMLInputElement, NeuSearchBarProps>(
  ({ icon, trailing, style, className, ...props }, ref) => {
    const barStyle: CSSProperties = {
      background: 'var(--ou-bg)',
      borderRadius: 'var(--ou-radius-pill)',
      boxShadow: 'var(--ou-neu-raised-md)',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transition: 'all var(--ou-transition)',
      ...style,
    };

    return (
      <div style={barStyle} className={className}>
        {icon && <span style={{ color: 'var(--ou-text-muted)', fontSize: 16 }}>{icon}</span>}
        <input
          ref={ref}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 15,
            color: 'var(--ou-text-strong)',
            fontFamily: 'inherit',
          }}
          {...props}
        />
        {trailing}
      </div>
    );
  }
);
NeuSearchBar.displayName = 'NeuSearchBar';
