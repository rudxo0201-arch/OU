'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageCircle, CalendarDays, CheckSquare, Repeat2,
  Lightbulb, BookOpen, Settings, ShieldCheck, Plus,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { ORBS_META, ROUTES } from '@/lib/ou-registry';
import { useAuthStore } from '@/stores/authStore';

const ICON_MAP: Record<string, LucideIcon> = {
  MessageCircle, CalendarDays, CheckSquare, Repeat2,
  Lightbulb, BookOpen, Settings,
};

const ICON_SIZE = 40;

function OrbIconBtn({
  icon: Icon,
  href,
  label,
  active,
  dashed,
}: {
  icon: LucideIcon;
  href?: string;
  label: string;
  active?: boolean;
  dashed?: boolean;
}) {
  const style: React.CSSProperties = {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    cursor: href ? 'pointer' : 'default',
    transition: 'filter 160ms ease',
    background: 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.7)',
    border: dashed
      ? '1.5px dashed rgba(255,255,255,0.35)'
      : `1.5px solid ${active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'}`,
    ...(active ? { filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' } : {}),
  };

  const inner = <Icon size={18} strokeWidth={1.5} />;

  if (href) {
    return (
      <Link href={href} title={label} style={{ display: 'flex' }}>
        <div style={style}>{inner}</div>
      </Link>
    );
  }
  return <button title={label} style={{ ...style, padding: 0 }} type="button">{inner}</button>;
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
      gap: 12,
    }}>
      {/* Orb 추가 placeholder (비활성) */}
      <OrbIconBtn icon={Plus} label="Orb 추가" dashed />

      {/* 구분선 */}
      <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.12)' }} />

      {/* Orb 목록 */}
      {ORBS_META.map((orb) => {
        const Icon = ICON_MAP[orb.icon];
        if (!Icon) return null;
        const href = ROUTES.ORB(orb.slug);
        return (
          <OrbIconBtn
            key={orb.slug}
            icon={Icon}
            href={href}
            label={orb.label}
            active={pathname.startsWith(href)}
          />
        );
      })}

      {isAdmin && (
        <OrbIconBtn
          icon={ShieldCheck}
          href="/orb/admin"
          label="관리자"
          active={pathname.startsWith('/orb/admin')}
        />
      )}
    </div>
  );
}
