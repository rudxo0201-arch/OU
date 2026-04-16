'use client';

import {
  Newspaper, ChatCircle, Gear, Sun, Moon,
} from '@phosphor-icons/react';
import { useRouter, usePathname } from 'next/navigation';
import { SystemOrbDock, type SystemOrbItem } from './SystemOrbDock';

interface OUUniverseShellProps {
  children: React.ReactNode;
}

export function OUUniverseShell({ children }: OUUniverseShellProps) {
  const router = useRouter();
  const pathname = usePathname();

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
      icon: Sun,
      label: '라이트 모드',
      onClick: () => {
        // Theme toggle removed - always dark
      },
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--ou-space, #060810)',
      }}
    >
      {/* Main content */}
      <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1, overflowY: 'auto' }}>
        {children}
      </div>

      {/* Left orb dock -- system navigation */}
      <SystemOrbDock side="left" items={systemOrbs} />
    </div>
  );
}
