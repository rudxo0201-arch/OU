'use client';

import { ReactNode, useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

export default function AppsLayout({ children }: { children: ReactNode }) {
  const initTheme = useThemeStore(s => s.init);
  useEffect(() => { initTheme(); }, [initTheme]);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ou-bg, #0a0a0f)', color: 'var(--ou-text, #fff)' }}>
      {children}
    </div>
  );
}
