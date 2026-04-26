'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageCircle, CalendarDays, CheckSquare, Repeat2,
  Lightbulb, BookOpen, Settings, ShieldCheck,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { OuOrbIcon } from '@/components/ds';
import { ORBS_META, ROUTES } from '@/lib/ou-registry';
import { useAuthStore } from '@/stores/authStore';

const ICON_MAP: Record<string, LucideIcon> = {
  MessageCircle,
  CalendarDays,
  CheckSquare,
  Repeat2,
  Lightbulb,
  BookOpen,
  Settings,
};

export function RightOrbBar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = (user as any)?.user_metadata?.role === 'admin';

  return (
    <div style={{
      position: 'fixed',
      right: 0, top: 56, bottom: 0,
      width: 60,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      {ORBS_META.map((orb) => {
        const Icon = ICON_MAP[orb.icon];
        if (!Icon) return null;
        const href = ROUTES.ORB(orb.slug);
        const active = pathname.startsWith(href);
        return (
          <Link key={orb.slug} href={href} style={{ display: 'flex' }}>
            <OuOrbIcon
              icon={Icon}
              variant="outline"
              size={32}
              selected={active}
              label={orb.label}
            />
          </Link>
        );
      })}
      {isAdmin && (
        <Link href="/orb/admin" style={{ display: 'flex' }}>
          <OuOrbIcon
            icon={ShieldCheck}
            variant="outline"
            size={32}
            label="관리자"
            selected={pathname.startsWith('/orb/admin')}
          />
        </Link>
      )}
    </div>
  );
}
