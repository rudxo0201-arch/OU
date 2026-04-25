'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, CheckSquare, Repeat2, BookOpen, Settings, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const ORBS = [
  { slug: 'schedule', icon: <CalendarDays size={18} strokeWidth={1.5} />, label: '일정' },
  { slug: 'task',     icon: <CheckSquare  size={18} strokeWidth={1.5} />, label: '할일' },
  { slug: 'habit',    icon: <Repeat2      size={18} strokeWidth={1.5} />, label: '습관' },
  { slug: 'journal',  icon: <BookOpen     size={18} strokeWidth={1.5} />, label: '일기' },
  { slug: 'settings', icon: <Settings     size={18} strokeWidth={1.5} />, label: '설정' },
] as const;

const ADMIN_ORB = {
  slug: 'admin',
  icon: <ShieldCheck size={18} strokeWidth={1.5} />,
  label: '관리자',
};

function OrbBtn({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href} title={label}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? 'var(--ou-surface)' : 'none',
          border: active ? '1px solid var(--ou-border)' : '1px solid transparent',
          borderRadius: 10,
          cursor: 'pointer',
          color: active || hovered ? 'var(--ou-text)' : 'var(--ou-text-muted)',
          transition: 'all 160ms ease',
          filter: active || hovered ? 'drop-shadow(0 0 6px rgba(255,255,255,0.25))' : 'none',
        }}
      >
        {icon}
      </div>
    </Link>
  );
}

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
      {ORBS.map((orb) => (
        <OrbBtn
          key={orb.slug}
          href={`/orb/${orb.slug}`}
          icon={orb.icon}
          label={orb.label}
          active={pathname.startsWith(`/orb/${orb.slug}`)}
        />
      ))}
      {isAdmin && (
        <OrbBtn
          href={`/orb/${ADMIN_ORB.slug}`}
          icon={ADMIN_ORB.icon}
          label={ADMIN_ORB.label}
          active={pathname.startsWith(`/orb/${ADMIN_ORB.slug}`)}
        />
      )}
    </div>
  );
}
