'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CSSProperties, useState } from 'react';
import { GlassAvatar, OuLogo } from '@/components/ds';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Universe', href: '/universe' },
  { label: 'Orbit', href: '/orbit' },
];

export function TopNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  const navStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: 'var(--ou-space-4)',
    background: 'rgba(228,228,234,0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.5)',
  };

  return (
    <nav style={navStyle}>
      {/* 로고 */}
      <Link href="/home" style={{ marginRight: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <OuLogo width={36} color="rgba(0,0,0,0.88)" />
        <span style={{
          width: 1,
          height: 14,
          background: 'rgba(0,0,0,0.15)',
        }} />
      </Link>

      {/* 네비 아이템 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 30,
                padding: '0 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.42)',
                background: isActive ? 'rgba(255,255,255,0.85)' : 'transparent',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 140ms ease',
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 우측 영역 */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 시계 */}
        <Clock />

        {/* 아바타 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            <GlassAvatar
              name={user?.email ?? ''}
              size={32}
              glow={avatarHovered}
            />
          </button>

          {showMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              background: 'var(--ou-glass-elevated)',
              backdropFilter: 'var(--ou-blur)',
              WebkitBackdropFilter: 'var(--ou-blur)',
              border: '1px solid var(--ou-glass-border-hover)',
              borderRadius: 'var(--ou-radius-md)',
              boxShadow: 'var(--ou-shadow-lg)',
              padding: '4px',
              minWidth: 160,
              animation: 'ou-slide-down 150ms ease-out',
            }}>
              <div style={{
                padding: '8px 12px 6px',
                fontSize: 'var(--ou-text-xs)',
                color: 'var(--ou-text-muted)',
                borderBottom: '1px solid var(--ou-glass-border)',
                marginBottom: 4,
              }}>
                {user?.email}
              </div>
              <Link href="/orb/admin" onClick={() => setShowMenu(false)}>
                <div style={{
                  padding: '8px 12px',
                  fontSize: 'var(--ou-text-sm)',
                  color: 'var(--ou-text-body)',
                  borderRadius: 'var(--ou-radius-xs)',
                  transition: 'background var(--ou-transition-fast)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  관리자
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontSize: 'var(--ou-text-sm)',
                  color: 'var(--ou-error)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 'var(--ou-radius-xs)',
                  transition: 'background var(--ou-transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function Clock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <span style={{
      fontSize: 'var(--ou-text-sm)',
      color: 'var(--ou-text-muted)',
      fontVariantNumeric: 'tabular-nums',
      fontFamily: 'var(--ou-font-mono)',
    }}>
      {time}
    </span>
  );
}
