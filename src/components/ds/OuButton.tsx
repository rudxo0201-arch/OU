'use client';

import { ButtonHTMLAttributes, CSSProperties, ReactNode, useState } from 'react';

export type OuButtonVariant = 'default' | 'ghost' | 'accent' | 'danger';
export type OuButtonSize = 'sm' | 'md' | 'lg';

export interface OuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: OuButtonVariant;
  size?: OuButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const SIZE_MAP: Record<OuButtonSize, { height: string; padding: string; fontSize: string }> = {
  sm: { height: '32px', padding: '0 14px', fontSize: 'var(--ou-text-xs)' },
  md: { height: '40px', padding: '0 20px', fontSize: 'var(--ou-text-sm)' },
  lg: { height: '48px', padding: '0 28px', fontSize: 'var(--ou-text-base)' },
};

export function OuButton({
  variant = 'default',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  style,
  ...rest
}: OuButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isDisabled = disabled || loading;
  const sz = SIZE_MAP[size];

  const variantStyle: CSSProperties = (() => {
    if (variant === 'accent') {
      return {
        background: hovered && !isDisabled ? 'var(--ou-accent-hover)' : 'var(--ou-accent)',
        border: '1px solid transparent',
        color: '#fff',
        boxShadow: 'none',
      };
    }
    if (variant === 'danger') {
      return {
        background: hovered && !isDisabled ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.07)',
        border: `1px solid ${hovered && !isDisabled ? 'rgba(220,38,38,0.35)' : 'rgba(220,38,38,0.18)'}`,
        color: 'var(--ou-error)',
        boxShadow: 'none',
      };
    }
    if (variant === 'ghost') {
      return {
        background: hovered && !isDisabled ? 'rgba(0,0,0,0.04)' : 'transparent',
        border: '1px solid transparent',
        color: 'var(--ou-text-secondary)',
        boxShadow: 'none',
      };
    }
    // default
    return {
      background: hovered && !isDisabled ? 'var(--ou-glass-hover)' : 'var(--ou-surface)',
      border: `1px solid ${hovered && !isDisabled ? 'var(--ou-glass-border-hover)' : 'var(--ou-glass-border)'}`,
      color: 'var(--ou-text-strong)',
      boxShadow: hovered && !isDisabled ? 'var(--ou-shadow-md)' : 'var(--ou-shadow-sm)',
    };
  })();

  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--ou-space-2)',
        height: sz.height,
        padding: sz.padding,
        fontSize: sz.fontSize,
        fontFamily: 'var(--ou-font-body)',
        fontWeight: 500,
        borderRadius: 'var(--ou-radius-pill)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.45 : 1,
        transition: 'background var(--ou-transition-fast), border-color var(--ou-transition-fast), box-shadow var(--ou-transition-fast), transform var(--ou-transition-fast)',
        transform: pressed && !isDisabled ? 'scale(0.97)' : 'scale(1)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
        ...variantStyle,
        ...style,
      }}
      onMouseEnter={(e) => { if (!isDisabled) setHovered(true); rest.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); setPressed(false); rest.onMouseLeave?.(e); }}
      onMouseDown={(e) => { if (!isDisabled) setPressed(true); rest.onMouseDown?.(e); }}
      onMouseUp={(e) => { setPressed(false); rest.onMouseUp?.(e); }}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            border: '2px solid rgba(0,0,0,0.12)',
            borderTopColor: variant === 'accent' ? '#fff' : 'var(--ou-accent)',
            borderRadius: '50%',
            animation: 'ou-spin 0.7s linear infinite',
            display: 'inline-block',
          }}
        />
      ) : children}
    </button>
  );
}
