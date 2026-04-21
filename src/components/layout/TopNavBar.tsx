'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CSSProperties, useState } from 'react';
import { GlassAvatar } from '@/components/ds';
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
    background: 'rgba(11,11,17,0.75)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderBottom: '1px solid var(--ou-glass-border)',
  };

  return (
    <nav style={navStyle}>
      {/* 로고 */}
      <Link href="/home" style={{ marginRight: 8, display: 'flex', alignItems: 'center' }}>
        <span style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--ou-text-heading)',
          letterSpacing: '-0.02em',
          textShadow: 'var(--ou-accent-glow)',
        }}>
          OU
        </span>
      </Link>

      {/* 네비 아이템 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 32,
                padding: '0 12px',
                borderRadius: 'var(--ou-radius-pill)',
                fontSize: 'var(--ou-text-sm)',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
                background: isActive ? 'var(--ou-glass-strong)' : 'transparent',
                transition: 'all var(--ou-transition-fast)',
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
