'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { LeftIconBar } from '@/components/layout/LeftIconBar';
import { RightOrbBar } from '@/components/layout/RightOrbBar';
import { StarField } from '@/components/layout/StarField';
import { usePreferencesSync } from '@/hooks/usePreferencesSync';
import { useThemeStore } from '@/stores/themeStore';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  usePreferencesSync();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  const initTheme = useThemeStore(s => s.init);
  useEffect(() => { initTheme(); }, [initTheme]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
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
      <StarField />
      <LeftIconBar />
      <TopNavBar />
      <RightOrbBar />
      {/* 좌60px + 우60px 보정 */}
      <div style={{ paddingLeft: 60, paddingRight: 60 }}>
        {children}
      </div>
    </>
  );
}
