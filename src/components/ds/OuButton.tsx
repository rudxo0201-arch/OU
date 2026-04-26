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
    // accent: 테마 강조색(다크=흰, 라이트=검정) 배경, 반전 텍스트
    if (variant === 'accent') {
      return {
        background: hovered && !isDisabled ? 'var(--ou-accent-hover)' : 'var(--ou-accent)',
        border: '1px solid var(--ou-accent)',
        color: 'var(--ou-bg)',
        boxShadow: hovered && !isDisabled ? 'var(--ou-glow-sm)' : 'none',
        fontWeight: 600,
      };
    }
    if (variant === 'danger') {
      return {
        background: hovered && !isDisabled ? 'var(--ou-surface-muted)' : 'transparent',
        border: `1px solid ${hovered && !isDisabled ? 'var(--ou-error)' : 'var(--ou-error)'}`,
        color: 'var(--ou-error)',
        boxShadow: 'none',
        fontWeight: 500,
        opacity: hovered ? 1 : 0.7,
      };
    }
    if (variant === 'ghost') {
      return {
        background: hovered && !isDisabled ? 'var(--ou-surface-hover)' : 'transparent',
        border: '1px solid transparent',
        color: hovered && !isDisabled ? 'var(--ou-text-strong)' : 'var(--ou-text-secondary)',
        boxShadow: 'none',
        fontWeight: 500,
      };
    }
    // default: outlined — 테마 적응형
    return {
      background: hovered && !isDisabled ? 'var(--ou-surface-hover)' : 'transparent',
      border: `1px solid ${hovered && !isDisabled ? 'var(--ou-border-hover)' : 'var(--ou-border-strong)'}`,
      color: 'var(--ou-text-strong)',
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
        fontFamily: 'var(--ou-font-display)',
        letterSpacing: '0.04em',
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
            border: `1.5px solid var(--ou-surface-muted)`,
            borderTopColor: 'var(--ou-text-heading)',
            borderRadius: '50%',
            animation: 'ou-spin 0.7s linear infinite',
            display: 'inline-block',
          }}
        />
      ) : children}
    </button>
  );
}
