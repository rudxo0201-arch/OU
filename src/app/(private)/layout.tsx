'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { useState, useEffect } from 'react';

// universe 페이지에서는 상단바 숨김 (몰입형)
const HIDE_TOPNAV_PATHS = ['/universe'];

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [universeActive, setUniverseActive] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      setUniverseActive((e as CustomEvent).detail.active);
    };
    window.addEventListener('universe-mode-change', handler);
    return () => window.removeEventListener('universe-mode-change', handler);
  }, []);

  // 경로 이동 시 universe 모드 초기화
  useEffect(() => { setUniverseActive(false); }, [pathname]);

  const isHiddenPath = HIDE_TOPNAV_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const showTopNav = !isHiddenPath && !universeActive;
  const userInitial = user?.email?.charAt(0).toUpperCase();

  return (
    <>
      {showTopNav && <TopNavBar userInitial={userInitial} />}
      {children}
    </>
  );
}
