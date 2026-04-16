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
              background: 'transparent',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
              transition: 'all 150ms ease',
              boxShadow: item.active ? 'var(--ou-glow-md, 0 0 20px 2px rgba(255,255,255,0.08))' : 'var(--ou-glow-xs, none)',
              color: 'var(--ou-text-body, rgba(255,255,255,0.7))',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = 'var(--ou-glow-hover, 0 0 24px 3px rgba(255,255,255,0.12))';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = item.active ? 'var(--ou-glow-md)' : 'var(--ou-glow-xs)';
            }}
          >
            <item.icon size={iconSize} weight={item.active ? 'fill' : 'light'} />
          </UnstyledButton>
        </Tooltip>
      ))}
    </Box>
  );
}
