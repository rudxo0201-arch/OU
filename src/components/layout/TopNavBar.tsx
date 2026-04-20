'use client';

import { usePathname, useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Orb', href: '/chat' },
  { label: 'Universe', href: '/universe' },
  { label: 'Orbit', href: '/orbit' },
  { label: 'View Studio', href: '/settings?tab=views' },
];

function getDateLabel() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[now.getDay()];
  return `${month}/${day} · ${weekday}`;
}

interface TopNavBarProps {
  userInitial?: string;
}

export function TopNavBar({ userInitial }: TopNavBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dateLabel = getDateLabel();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 50,
        background: 'var(--ou-bg)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        gap: 32,
      }}
    >
      {/* OU 로고 → /my */}
      <button
        onClick={() => router.push('/my')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ou.svg" alt="OU" style={{ height: 20, opacity: pathname === '/my' ? 1 : 0.5 }} />
      </button>

      {/* 탭 네비게이션 */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href.split('?')[0]);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
                fontFamily: 'inherit',
                transition: 'color 0.15s',
                letterSpacing: isActive ? '-0.01em' : 0,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* 우측: 날짜 + 아바타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--ou-text-muted)', letterSpacing: '0.5px' }}>
          {dateLabel}
        </span>
        {userInitial && (
          <div
            onClick={() => router.push('/settings')}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--ou-border-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ou-text-secondary)',
              cursor: 'pointer',
            }}
          >
            {userInitial}
          </div>
        )}
      </div>
    </div>
  );
}
