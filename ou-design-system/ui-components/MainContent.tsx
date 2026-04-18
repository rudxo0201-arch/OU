'use client';

import { useNavigationStore } from '@/stores/navigationStore';

export function MainContent({ children }: { children: React.ReactNode }) {
  const { sidebarExpanded } = useNavigationStore();

  return (
    <main
      style={{
        marginLeft: sidebarExpanded ? 220 : 60,
        transition: 'margin-left 200ms ease',
        minHeight: '100vh',
      }}
    >
      {children}
    </main>
  );
}
