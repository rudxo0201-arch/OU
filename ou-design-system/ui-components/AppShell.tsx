'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useNavigationStore } from '@/stores/navigationStore';
import classes from './AppShell.module.css';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarExpanded } = useNavigationStore();
  const isLanding = pathname === '/';
  const isExplore = pathname === '/explore';
  const isBrowse = pathname === '/explore/browse';
  const isMy = pathname === '/my';
  const isUniverse = pathname === '/universe';
  const isLogin = pathname === '/login';
  const isTermsAgree = pathname === '/terms-agree';

  if (isLanding || isExplore || isBrowse || isMy || isUniverse || isLogin || isTermsAgree) {
    return <>{children}</>;
  }

  return (
    <>
      <div className={classes.desktopSidebar}>
        <Sidebar />
      </div>
      <main
        className={classes.main}
        style={{
          '--sidebar-width': sidebarExpanded ? '220px' : '60px',
        } as React.CSSProperties}
      >
        {children}
      </main>
      <MobileNav />
    </>
  );
}
