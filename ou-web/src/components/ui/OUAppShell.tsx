'use client';

import { Box } from '@mantine/core';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useNavigationStore } from '@/stores/navigationStore';
import classes from './AppShell.module.css';

interface OUAppShellProps {
  children: React.ReactNode;
}

export function OUAppShell({ children }: OUAppShellProps) {
  const { collapsed } = useNavigationStore();
  const sidebarWidth = collapsed ? '60px' : '220px';

  return (
    <>
      {/* 데스크톱 사이드바 */}
      <div className={classes.desktopSidebar}>
        <Sidebar />
      </div>

      {/* 메인 컨텐츠 */}
      <Box
        className={classes.main}
        style={{ '--sidebar-width': sidebarWidth } as React.CSSProperties}
      >
        {children}
      </Box>

      {/* 모바일 하단 탭 */}
      <MobileNav />
    </>
  );
}
