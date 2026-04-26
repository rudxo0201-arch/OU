'use client';

import { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export interface OuIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  'aria-label': string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'solid';
}

const SIZE_MAP = {
  sm: { wh: 28, iconSize: 14 },
  md: { wh: 36, iconSize: 16 },
};

export function OuIconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  disabled,
  style,
  ...rest
}: OuIconButtonProps) {
  const { wh } = SIZE_MAP[size];

  const variantStyle: CSSProperties = variant === 'solid'
    ? {
        background: 'transparent',
        border: '1px solid transparent',
        boxShadow: 'var(--ou-glow-md)',
        color: 'var(--ou-text-heading)',
      }
    : {
        background: 'transparent',
        border: '1px solid transparent',
      };

  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: wh,
        height: wh,
        borderRadius: 'var(--ou-radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.38 : 1,
        color: 'var(--ou-text-muted)',
        transition: 'background var(--ou-transition-fast), border-color var(--ou-transition-fast), color var(--ou-transition-fast)',
        flexShrink: 0,
        padding: 0,
        ...variantStyle,
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          const el = e.currentTarget as HTMLButtonElement;
          if (variant === 'solid') {
            el.style.background = 'transparent';
            el.style.boxShadow = 'var(--ou-glow-lg)';
            el.style.color = 'var(--ou-text-heading)';
          } else {
            el.style.background = 'var(--ou-surface-hover)';
            el.style.color = 'var(--ou-text-body)';
          }
        }
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        if (!disabled) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = variantStyle.background as string;
          el.style.boxShadow = (variantStyle.boxShadow as string) ?? '';
          el.style.color = variant === 'solid' ? 'var(--ou-text-heading)' : 'var(--ou-text-muted)';
        }
        rest.onMouseLeave?.(e);
      }}
    >
      {icon}
    </button>
  );
}
