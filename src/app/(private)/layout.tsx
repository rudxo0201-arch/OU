'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { QSDSpotlight } from '@/components/qsd/QSDSpotlight';
import { useState, useEffect, useCallback } from 'react';

// universe 페이지에서는 상단바 숨김 (몰입형)
const HIDE_TOPNAV_PATHS = ['/universe', '/app'];
// 홈에서는 Spotlight 사용 안 함 (QSD탭이 내장되어 있음)
const QSD_INLINE_PATHS = ['/home'];

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();
  const [universeActive, setUniverseActive] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      setUniverseActive((e as CustomEvent).detail.active);
    };
    window.addEventListener('universe-mode-change', handler);
    return () => window.removeEventListener('universe-mode-change', handler);
  }, []);

  // 경로 이동 시 universe 모드 + spotlight 초기화
  useEffect(() => {
    setUniverseActive(false);
    setSpotlightOpen(false);
  }, [pathname]);

  // 글로벌 Cmd+K: 홈에서는 QSD탭이 내장 → 스팟라이트 불필요
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const isHomePath = QSD_INLINE_PATHS.some(p => pathname === p);
      if (!isHomePath) {
        setSpotlightOpen(prev => !prev);
      }
    }
  }, [pathname]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isHiddenPath = HIDE_TOPNAV_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const showTopNav = !isHiddenPath && !universeActive;
  const userInitial = user?.email?.charAt(0).toUpperCase();

  return (
    <>
      {showTopNav && <TopNavBar userInitial={userInitial} isAdmin={isAdmin} />}
      {children}
      <QSDSpotlight open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />
    </>
  );
}
