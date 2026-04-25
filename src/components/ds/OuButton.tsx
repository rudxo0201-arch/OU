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
  md: { height: '38px', padding: '0 20px', fontSize: 'var(--ou-text-sm)' },
  lg: { height: '46px', padding: '0 28px', fontSize: 'var(--ou-text-base)' },
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
    // solid white — 화이트 테두리 + 화이트 배경, 블랙 텍스트
    if (variant === 'accent') {
      return {
        background: hovered && !isDisabled ? 'rgba(255,255,255,0.90)' : '#ffffff',
        border: '1px solid #ffffff',
        color: '#000000',
        boxShadow: hovered && !isDisabled ? 'var(--ou-glow-sm)' : 'none',
        fontWeight: 600,
      };
    }
    if (variant === 'danger') {
      return {
        background: hovered && !isDisabled ? 'rgba(170,80,80,0.14)' : 'transparent',
        border: `1px solid ${hovered && !isDisabled ? 'rgba(170,80,80,0.60)' : 'rgba(170,80,80,0.35)'}`,
        color: 'var(--ou-error)',
        boxShadow: 'none',
        fontWeight: 500,
      };
    }
    if (variant === 'ghost') {
      return {
        background: hovered && !isDisabled ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: '1px solid transparent',
        color: hovered && !isDisabled ? 'var(--ou-text-strong)' : 'var(--ou-text-secondary)',
        boxShadow: 'none',
        fontWeight: 500,
      };
    }
    // default — outlined: 더 하얀 테두리, 투명 배경
    return {
      background: hovered && !isDisabled ? 'rgba(255,255,255,0.06)' : 'transparent',
      border: `1px solid ${hovered && !isDisabled ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.55)'}`,
      color: hovered && !isDisabled ? '#ffffff' : 'rgba(255,255,255,0.90)',
      boxShadow: hovered && !isDisabled ? 'var(--ou-glow-sm)' : 'none',
      fontWeight: 500,
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
        letterSpacing: '0.01em',
        borderRadius: 'var(--ou-radius-pill)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.38 : 1,
        transition: 'background var(--ou-transition-fast), border-color var(--ou-transition-fast), box-shadow var(--ou-transition-fast), color var(--ou-transition-fast), transform var(--ou-transition-fast)',
        transform: pressed && !isDisabled ? 'scale(0.96)' : 'scale(1)',
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
            width: 13,
            height: 13,
            border: `1.5px solid ${variant === 'accent' ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.20)'}`,
            borderTopColor: variant === 'accent' ? '#000000' : '#ffffff',
            borderRadius: '50%',
            animation: 'ou-spin 0.7s linear infinite',
            display: 'inline-block',
          }}
        />
      ) : children}
    </button>
  );
}
