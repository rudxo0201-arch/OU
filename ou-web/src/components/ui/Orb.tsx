'use client';

import type { Icon } from '@phosphor-icons/react';

interface OrbProps {
  icon: Icon;
  label: string;
  active?: boolean;
  size?: number;
  onClick?: () => void;
}

export function Orb({ icon: IconComponent, label, active = false, size = 48, onClick }: OrbProps) {
  const iconSize = Math.round(size * 0.46);

  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ou-orb-bg)',
        backdropFilter: 'blur(var(--ou-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--ou-glass-blur))',
        border: `0.5px solid var(--ou-orb-border)`,
        transition: 'all 150ms ease',
        boxShadow: active ? '0 0 20px 4px var(--ou-orb-glow)' : 'none',
        cursor: 'pointer',
        padding: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 0 16px 2px var(--ou-orb-glow)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = active ? '0 0 20px 4px var(--ou-orb-glow)' : 'none';
      }}
    >
      <IconComponent
        size={iconSize}
        weight={active ? 'fill' : 'light'}
      />
    </button>
  );
}
