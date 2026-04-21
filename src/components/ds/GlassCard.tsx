'use client';

import { CSSProperties, MouseEvent, ReactNode, useState } from 'react';

interface GlassCardProps {
  children: ReactNode;
  padding?: number | string;
  elevated?: boolean;
  hoverable?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
  className?: string;
}

export function GlassCard({
  children,
  padding = 'var(--ou-space-6)',
  elevated = false,
  hoverable = false,
  onClick,
  style,
  className,
}: GlassCardProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isInteractive = !!(hoverable || onClick);

  const cardStyle: CSSProperties = {
    background: pressed
      ? 'var(--ou-glass-active)'
      : hovered
        ? 'var(--ou-glass-hover)'
        : elevated
          ? 'var(--ou-glass-elevated)'
          : 'var(--ou-glass)',
    backdropFilter: 'var(--ou-blur)',
    WebkitBackdropFilter: 'var(--ou-blur)',
    border: `1px solid ${hovered ? 'var(--ou-glass-border-hover)' : 'var(--ou-glass-border)'}`,
    borderRadius: 'var(--ou-radius-card)',
    boxShadow: elevated ? 'var(--ou-shadow-lg)' : 'var(--ou-shadow-md)',
    padding: typeof padding === 'number' ? `${padding}px` : padding,
    transition: 'background var(--ou-transition-fast), border-color var(--ou-transition-fast), box-shadow var(--ou-transition-fast), transform var(--ou-transition-fast)',
    transform: isInteractive && hovered && !pressed ? 'translateY(-1px)' : 'translateY(0)',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    ...style,
  };

  return (
    <div
      style={cardStyle}
      className={className}
      onClick={onClick}
      onMouseEnter={() => isInteractive && setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => isInteractive && setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      {children}
    </div>
  );
}
