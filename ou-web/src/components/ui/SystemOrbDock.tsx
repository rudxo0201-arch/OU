'use client';

import { Box, Tooltip, UnstyledButton } from '@mantine/core';
import type { Icon } from '@phosphor-icons/react';

export interface SystemOrbItem {
  id: string;
  icon: Icon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface SystemOrbDockProps {
  side: 'left' | 'right';
  items: SystemOrbItem[];
  orbSize?: number;
}

export function SystemOrbDock({ side, items, orbSize = 44 }: SystemOrbDockProps) {
  if (items.length === 0) return null;

  const iconSize = Math.round(orbSize * 0.46);

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 24,
        [side]: 16,
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {items.map(item => (
        <Tooltip key={item.id} label={item.label} position={side === 'left' ? 'right' : 'left'} withArrow>
          <UnstyledButton
            onClick={item.onClick}
            style={{
              width: orbSize,
              height: orbSize,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--ou-orb-bg)',
              backdropFilter: 'blur(var(--ou-glass-blur))',
              WebkitBackdropFilter: 'blur(var(--ou-glass-blur))',
              border: '0.5px solid var(--ou-orb-border)',
              transition: 'all 150ms ease',
              boxShadow: item.active ? '0 0 20px 4px var(--ou-orb-glow)' : 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 0 16px 2px var(--ou-orb-glow)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = item.active ? '0 0 20px 4px var(--ou-orb-glow)' : 'none';
            }}
          >
            <item.icon size={iconSize} weight={item.active ? 'fill' : 'light'} />
          </UnstyledButton>
        </Tooltip>
      ))}
    </Box>
  );
}
