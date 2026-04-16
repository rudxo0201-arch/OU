'use client';

import { Box } from '@mantine/core';
import {
  Newspaper, ChatCircle, Gear, Sun, Moon,
} from '@phosphor-icons/react';
import { useMantineColorScheme } from '@mantine/core';
import { useRouter, usePathname } from 'next/navigation';
import { SystemOrbDock, type SystemOrbItem } from './SystemOrbDock';

interface OUUniverseShellProps {
  children: React.ReactNode;
}

export function OUUniverseShell({ children }: OUUniverseShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setColorScheme, colorScheme } = useMantineColorScheme();

  const systemOrbs: SystemOrbItem[] = [
    {
      id: 'feed',
      icon: Newspaper,
      label: 'Feed',
      active: pathname === '/feed',
      onClick: () => router.push('/feed'),
    },
    {
      id: 'messages',
      icon: ChatCircle,
      label: 'Messages',
      active: pathname === '/messages',
      onClick: () => router.push('/messages'),
    },
    {
      id: 'settings',
      icon: Gear,
      label: '설정',
      active: pathname === '/settings',
      onClick: () => router.push('/settings'),
    },
    {
      id: 'theme',
      icon: colorScheme === 'dark' ? Sun : Moon,
      label: colorScheme === 'dark' ? '라이트 모드' : '다크 모드',
      onClick: () => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark'),
    },
  ];

  return (
    <Box
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--ou-space, #060810)',
      }}
    >
      {/* Main content */}
      <Box style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1, overflowY: 'auto' }}>
        {children}
      </Box>

      {/* Left orb dock — system navigation */}
      <SystemOrbDock side="left" items={systemOrbs} />
    </Box>
  );
}
