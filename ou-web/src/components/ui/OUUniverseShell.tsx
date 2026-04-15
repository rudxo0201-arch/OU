'use client';

import { Box } from '@mantine/core';
import {
  Compass, Newspaper, ChatCircle, Gear, Sun, Moon,
} from '@phosphor-icons/react';
import { useMantineColorScheme } from '@mantine/core';
import { useRouter, usePathname } from 'next/navigation';
import { OrbDock, type OrbItem } from './OrbDock';
import { useNavigationStore } from '@/stores/navigationStore';

interface OUUniverseShellProps {
  children: React.ReactNode;
}

export function OUUniverseShell({ children }: OUUniverseShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setColorScheme, colorScheme } = useMantineColorScheme();
  const { viewMode, setViewMode } = useNavigationStore();

  const systemOrbs: OrbItem[] = [
    {
      id: 'explore',
      icon: Compass,
      label: '탐험하기',
      active: viewMode === 'explore',
      onClick: () => {
        if (viewMode === 'explore') {
          setViewMode('dashboard');
        } else {
          setViewMode('explore');
        }
      },
    },
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
        background: 'var(--ou-bg)',
      }}
    >
      {/* Main content */}
      <Box style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1, overflowY: 'auto' }}>
        {children}
      </Box>

      {/* Right orb dock — system navigation */}
      <OrbDock side="right" items={systemOrbs} />
    </Box>
  );
}
