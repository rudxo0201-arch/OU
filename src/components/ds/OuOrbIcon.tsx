'use client';

import { CSSProperties } from 'react';
import { LucideIcon } from 'lucide-react';

export interface OuOrbIconProps {
  icon: LucideIcon;
  variant: 'filled' | 'outline';
  size?: 28 | 32 | 40;
  selected?: boolean;
  label?: string;
  animate?: string;
  onClick?: () => void;
  style?: CSSProperties;
}

export function OuOrbIcon({
  icon: Icon,
  variant,
  size = 32,
  selected = false,
  label,
  animate,
  onClick,
  style,
}: OuOrbIconProps) {
  const iconSize = Math.round(size * 0.5);

  const variantStyle: CSSProperties =
    variant === 'filled'
      ? { background: '#fff', color: '#111', border: 'none' }
      : { background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.85)' };

  const btnStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default',
    flexShrink: 0,
    padding: 0,
    transition: 'filter 160ms ease, opacity 160ms ease',
    ...variantStyle,
    ...(selected ? { filter: 'drop-shadow(0 0 10px var(--ou-accent))' } : {}),
    ...(animate ? { animation: animate } : {}),
    ...style,
  };

  return (
    <button title={label} onClick={onClick} style={btnStyle} type="button">
      <Icon size={iconSize} strokeWidth={1.5} />
    </button>
  );
}
