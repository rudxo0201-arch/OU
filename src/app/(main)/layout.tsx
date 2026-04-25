'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

export default function MainLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const initTheme = useThemeStore(s => s.init);

  useEffect(() => { initTheme(); }, [initTheme]);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  if (isLoading) return null;
  if (!user) return null;

  return <>{children}</>;
}
