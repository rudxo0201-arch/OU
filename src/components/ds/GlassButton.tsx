'use client';

import { ButtonHTMLAttributes, CSSProperties, ReactNode, useState } from 'react';

type ButtonVariant = 'ghost' | 'accent' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const SIZE_MAP: Record<ButtonSize, { height: string; padding: string; fontSize: string }> = {
  sm: { height: '36px', padding: '0 16px', fontSize: 'var(--ou-text-sm)' },
  md: { height: '44px', padding: '0 20px', fontSize: 'var(--ou-text-base)' },
  lg: { height: '52px', padding: '0 28px', fontSize: 'var(--ou-text-lg)' },
};

export function GlassButton({
  variant = 'ghost',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  style,
  ...rest
}: GlassButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isDisabled = disabled || loading;
  const sz = SIZE_MAP[size];

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--ou-space-2)',
    height: sz.height,
    padding: sz.padding,
    fontSize: sz.fontSize,
    fontFamily: 'var(--ou-font-body)',
    fontWeight: 500,
    borderRadius: 'var(--ou-radius-sm)',
    border: '1px solid',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.45 : 1,
    transition: 'background var(--ou-transition-fast), border-color var(--ou-transition-fast), box-shadow var(--ou-transition-fast), transform var(--ou-transition-fast)',
    transform: pressed && !isDisabled ? 'scale(0.97)' : 'scale(1)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    width: fullWidth ? '100%' : undefined,
    whiteSpace: 'nowrap',
  };

  const variantStyle: CSSProperties = (() => {
    if (variant === 'accent') {
      return {
        background: hovered && !isDisabled ? 'var(--ou-accent-hover)' : 'var(--ou-accent)',
        borderColor: 'transparent',
        color: '#fff',
        boxShadow: hovered && !isDisabled ? 'var(--ou-accent-glow-lg)' : 'var(--ou-accent-glow)',
      };
    }
    if (variant === 'danger') {
      return {
        background: hovered && !isDisabled ? 'rgba(248,113,113,0.15)' : 'rgba(248,113,113,0.08)',
        borderColor: hovered && !isDisabled ? 'rgba(248,113,113,0.4)' : 'rgba(248,113,113,0.2)',
        color: 'var(--ou-error)',
      };
    }
    // ghost
    return {
      background: hovered && !isDisabled ? 'var(--ou-glass-hover)' : 'var(--ou-glass)',
      backdropFilter: 'var(--ou-blur-light)',
      WebkitBackdropFilter: 'var(--ou-blur-light)',
      borderColor: hovered && !isDisabled ? 'var(--ou-glass-border-hover)' : 'var(--ou-glass-border)',
      color: 'var(--ou-text-body)',
    };
  })();

  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={{ ...baseStyle, ...variantStyle, ...style }}
      onMouseEnter={() => !isDisabled && setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !isDisabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      {loading ? (
        <span
          style={{
            width: 16,
            height: 16,
            border: '2px solid rgba(255,255,255,0.2)',
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
