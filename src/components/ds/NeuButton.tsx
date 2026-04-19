'use client';
import { CSSProperties, ReactNode } from 'react';

type NeuButtonVariant = 'default' | 'accent' | 'ghost';
type NeuButtonSize = 'sm' | 'md' | 'lg';

interface NeuButtonProps {
  children: ReactNode;
  variant?: NeuButtonVariant;
  size?: NeuButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function NeuButton({ children, variant = 'default', size = 'md', disabled = false, fullWidth = false, onClick, style, className, type = 'button' }: NeuButtonProps) {
  const sizeStyles: Record<string, CSSProperties> = {
    sm: { padding: '7px 16px', fontSize: 11 },
    md: { padding: '10px 24px', fontSize: 13 },
    lg: { padding: '14px 32px', fontSize: 15 },
  };

  const variantStyles: Record<string, CSSProperties> = {
    default: {
      background: 'var(--ou-bg)',
      color: 'var(--ou-text-strong)',
      boxShadow: 'var(--ou-neu-raised-md)',
    },
    accent: {
      background: 'linear-gradient(135deg, var(--ou-accent), var(--ou-accent-secondary))',
      color: '#fff',
      boxShadow: 'var(--ou-neu-raised-md)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--ou-text-secondary)',
      boxShadow: 'none',
    },
  };

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 'var(--ou-radius-pill)',
    fontFamily: 'inherit',
    fontWeight: 600,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all var(--ou-transition)',
    width: fullWidth ? '100%' : undefined,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <button type={type} style={baseStyle} className={className} onClick={disabled ? undefined : onClick} disabled={disabled}>
      {children}
    </button>
  );
}
