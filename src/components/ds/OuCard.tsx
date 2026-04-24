'use client';

import { CSSProperties, MouseEvent, ReactNode, useState } from 'react';

export type OuCardVariant = 'raised' | 'pressed' | 'flat';
export type OuCardSize = 'sm' | 'md' | 'lg';

export interface OuCardProps {
  children: ReactNode;
  /** explicit padding override */
  padding?: number | string;
  /** alias for variant="raised" with lg shadow */
  elevated?: boolean;
  hoverable?: boolean;
  variant?: OuCardVariant;
  size?: OuCardSize;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
  className?: string;
}

const PADDING_BY_SIZE: Record<OuCardSize, number> = { sm: 12, md: 20, lg: 28 };

const SHADOW_BY_VARIANT: Record<OuCardVariant, Record<OuCardSize, string>> = {
  raised:  { sm: 'var(--ou-shadow-sm)', md: 'var(--ou-shadow-md)', lg: 'var(--ou-shadow-lg)' },
  pressed: { sm: 'var(--ou-neu-pressed-sm)', md: 'var(--ou-neu-pressed-md)', lg: 'var(--ou-neu-pressed-lg)' },
  flat:    { sm: 'none', md: 'none', lg: 'none' },
};

export function OuCard({
  children,
  padding,
  elevated = false,
  hoverable = false,
  variant = 'raised',
  size = 'md',
  onClick,
  style,
  className,
}: OuCardProps) {
  const [hovered, setHovered] = useState(false);
  const [pressedState, setPressedState] = useState(false);

  const isInteractive = !!(hoverable || onClick);
  const resolvedPadding = padding !== undefined
    ? (typeof padding === 'number' ? `${padding}px` : padding)
    : `${PADDING_BY_SIZE[size]}px`;

  const shadow = elevated
    ? 'var(--ou-shadow-lg)'
    : pressedState && isInteractive
      ? 'var(--ou-neu-pressed-md)'
      : SHADOW_BY_VARIANT[variant][size];

  return (
    <div
      style={{
        background: pressedState && isInteractive
          ? 'var(--ou-glass-active)'
          : hovered && isInteractive
            ? 'var(--ou-glass-hover)'
            : 'var(--ou-surface)',
        border: `1px solid ${hovered && isInteractive ? 'var(--ou-glass-border-hover)' : 'var(--ou-glass-border)'}`,
        borderRadius: 'var(--ou-radius-card)',
        boxShadow: shadow,
        padding: resolvedPadding,
        transition: 'background var(--ou-transition-fast), border-color var(--ou-transition-fast), box-shadow var(--ou-transition-fast), transform var(--ou-transition-fast)',
        transform: isInteractive && hovered && !pressedState ? 'translateY(-1px)' : 'translateY(0)',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        ...style,
      }}
      className={className}
      onClick={onClick}
      onMouseEnter={() => isInteractive && setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressedState(false); }}
      onMouseDown={() => isInteractive && setPressedState(true)}
      onMouseUp={() => setPressedState(false)}
    >
      {children}
    </div>
  );
}
