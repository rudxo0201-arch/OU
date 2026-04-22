'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { SideBar } from '@/components/layout/SideBar';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--ou-space)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span className="ou-spinner" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <TopNavBar />
      <SideBar />
      {/* 사이드바 60px 보정 */}
      <div style={{ paddingLeft: 60 }}>
        {children}
      </div>
    </>
  );
}
