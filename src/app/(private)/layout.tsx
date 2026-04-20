'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { TopNavBar } from '@/components/layout/TopNavBar';

// universe 페이지에서는 상단바 숨김 (몰입형)
const HIDE_TOPNAV_PATHS = ['/universe'];

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const showTopNav = !HIDE_TOPNAV_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const userInitial = user?.email?.charAt(0).toUpperCase();

  return (
    <>
      {showTopNav && <TopNavBar userInitial={userInitial} />}
      {children}
    </>
  );
}
