'use client';

import { usePathname } from 'next/navigation';
import { OUAppShell } from '@/components/ui/OUAppShell';

/**
 * Public layout: pages like /market, /universe get the AppShell navigation.
 * The landing page (/) renders without navigation.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Landing page has its own full-screen layout — no app shell
  if (pathname === '/') {
    return <>{children}</>;
  }

  return <OUAppShell>{children}</OUAppShell>;
}
