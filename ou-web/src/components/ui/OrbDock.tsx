'use client';

import { useState } from 'react';
import { Box, Tooltip, UnstyledButton, Text, Menu } from '@mantine/core';
import { PushPin, PushPinSlash, ArrowsOutSimple } from '@phosphor-icons/react';

export interface OrbItem {
  id: string;
  label: string;
  emoji?: string;
  pinned?: boolean;
  active?: boolean;
  onClick?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
}

interface OrbDockProps {
  side: 'left' | 'right';
  items: OrbItem[];
  orbSize?: number;
}

export function OrbDock({ side, items, orbSize = 48 }: OrbDockProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        top: '50%',
        transform: 'translateY(-50%)',
        [side]: 24,
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {items.map(item => (
        <Menu
          key={item.id}
          opened={menuOpenId === item.id}
          onChange={opened => setMenuOpenId(opened ? item.id : null)}
          position={side === 'right' ? 'left-start' : 'right-start'}
          withArrow
        >
          <Menu.Target>
            <Tooltip
              label={item.label}
              position={side === 'right' ? 'left' : 'right'}
              withArrow
              disabled={menuOpenId === item.id}
            >
              <UnstyledButton
                onClick={item.onClick}
                onContextMenu={e => {
                  e.preventDefault();
                  setMenuOpenId(menuOpenId === item.id ? null : item.id);
                }}
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
                  boxShadow: item.pinned ? '0 0 16px 2px var(--ou-orb-glow)' : 'none',
                  opacity: item.pinned ? 1 : 0.6,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.15)';
                  e.currentTarget.style.boxShadow = '0 0 20px 4px var(--ou-orb-glow)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = item.pinned ? '0 0 16px 2px var(--ou-orb-glow)' : 'none';
                }}
              >
                <Text size="lg">{item.emoji || '📄'}</Text>
              </UnstyledButton>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<ArrowsOutSimple size={14} />}
              onClick={item.onClick}
            >
              열기
            </Menu.Item>
            {item.pinned ? (
              <Menu.Item
                leftSection={<PushPinSlash size={14} />}
                onClick={item.onUnpin}
              >
                바로가기 해제
              </Menu.Item>
            ) : (
              <Menu.Item
                leftSection={<PushPin size={14} />}
                onClick={item.onPin}
              >
                바로가기 고정
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      ))}
    </Box>
  );
}
