'use client';
import { CSSProperties, ReactNode } from 'react';

type NeuCardVariant = 'raised' | 'pressed' | 'flat';
type NeuCardSize = 'sm' | 'md' | 'lg';

interface NeuCardProps {
  children: ReactNode;
  variant?: NeuCardVariant;
  size?: NeuCardSize;
  hover?: boolean; // enable hover glow effect
  accentGlow?: boolean; // accent color glow on hover
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}

export function NeuCard({ children, variant = 'raised', size = 'md', hover = true, accentGlow = false, onClick, style, className }: NeuCardProps) {
  const shadowMap = {
    raised: { sm: 'var(--ou-neu-raised-sm)', md: 'var(--ou-neu-raised-md)', lg: 'var(--ou-neu-raised-lg)' },
    pressed: { sm: 'var(--ou-neu-pressed-sm)', md: 'var(--ou-neu-pressed-md)', lg: 'var(--ou-neu-pressed-lg)' },
    flat: { sm: 'none', md: 'none', lg: 'none' },
  };
  const paddingMap = { sm: 12, md: 20, lg: 28 };

  const baseStyle: CSSProperties = {
    background: 'var(--ou-bg)',
    borderRadius: 'var(--ou-radius-md)',
    boxShadow: shadowMap[variant][size],
    padding: paddingMap[size],
    transition: 'all var(--ou-transition)',
    cursor: onClick ? 'pointer' : undefined,
    ...style,
  };

  return (
    <div style={baseStyle} className={className} onClick={onClick}>
      {children}
    </div>
  );
}
