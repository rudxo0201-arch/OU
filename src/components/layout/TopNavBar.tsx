'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

const NAV_ITEMS = [
  { label: 'Universe', href: '/universe', adminOnly: false },
  { label: 'Orbit', href: '/orbit', adminOnly: true },
  { label: 'Orb Studio', href: '/orb-studio', adminOnly: true },
];

function getTimeLabel() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

interface TopNavBarProps {
  userInitial?: string;
  isAdmin?: boolean;
}

function TopNavBarInner({ userInitial, isAdmin }: TopNavBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [timeLabel, setTimeLabel] = useState('');

  useEffect(() => {
    setTimeLabel(getTimeLabel());
    const tick = () => setTimeLabel(getTimeLabel());
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  function isActive(item: typeof NAV_ITEMS[number]) {
    return pathname === item.href;
  }

  function getHref(item: typeof NAV_ITEMS[number]) {
    return item.href;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        zIndex: 50,
        background: 'var(--ou-bg)',
        borderBottom: '1px solid var(--ou-border-faint)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 40px',
        gap: 24,
      }}
    >
      {/* OU 로고 → /home */}
      <button
        onClick={() => router.push('/home')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          width: 36,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ou.svg" alt="OU" style={{ width: 36, height: 'auto', opacity: pathname === '/home' ? 1 : 0.5 }} />
      </button>

      {/* 탭 네비게이션 */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        {NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.label}
              onClick={() => router.push(getHref(item))}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
                fontFamily: 'inherit',
                transition: 'color 0.15s',
                letterSpacing: active ? '-0.01em' : 0,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* 우측: 날짜 + 아바타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--ou-text-muted)', letterSpacing: '1px', fontVariantNumeric: 'tabular-nums' }}>
          {timeLabel}
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

// useSearchParams는 Suspense 경계 필요
export function TopNavBar({ userInitial, isAdmin }: TopNavBarProps) {
  return (
    <Suspense fallback={null}>
      <TopNavBarInner userInitial={userInitial} isAdmin={isAdmin} />
    </Suspense>
  );
}
