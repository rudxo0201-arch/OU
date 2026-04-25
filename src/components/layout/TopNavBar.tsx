'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CSSProperties, useState } from 'react';
import { OuAvatar, OuLogo } from '@/components/ds';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import { useThemeStore, type ThemePreference } from '@/stores/themeStore';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark',  label: '다크' },
  { value: 'auto',  label: '자동' },
];

export function TopNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { preference: themePref, setPreference: setThemePref } = useThemeStore();

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
    padding: '0 20px',
    gap: 'var(--ou-space-4)',
    background: 'transparent',
  };

  return (
    <nav style={navStyle}>
      {/* 로고 */}
      <Link href="/home" style={{ marginRight: 12, display: 'flex', alignItems: 'center' }}>
        <OuLogo width={36} color="var(--ou-text)" />
      </Link>

      {/* 우측 영역 */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Clock />

        {/* 아바타 + 드롭다운 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            <OuAvatar name={user?.email ?? ''} size={32} glow={avatarHovered} />
          </button>

          {showMenu && (
            <>
              {/* 바깥 클릭 닫기 */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 299 }}
                onClick={() => setShowMenu(false)}
              />
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                zIndex: 300,
                background: 'rgba(15,15,20,0.94)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--ou-border)',
                borderRadius: 12,
                boxShadow: 'var(--ou-shadow-lg)',
                padding: '4px',
                minWidth: 180,
                animation: 'ou-slide-down 150ms ease-out',
              }}>
                {/* 이메일 */}
                <div style={{
                  padding: '8px 12px 7px',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.35)',
                  borderBottom: '1px solid var(--ou-border)',
                  marginBottom: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user?.email}
                </div>

                {/* 테마 선택 */}
                <div style={{ padding: '6px 12px 8px', borderBottom: '1px solid var(--ou-border)', marginBottom: 4 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    테마
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {THEME_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setThemePref(opt.value)}
                        style={{
                          flex: 1,
                          padding: '4px 0',
                          fontSize: 11,
                          fontWeight: themePref === opt.value ? 600 : 400,
                          color: themePref === opt.value ? '#fff' : 'rgba(255,255,255,0.38)',
                          background: themePref === opt.value ? 'rgba(255,255,255,0.12)' : 'none',
                          border: themePref === opt.value ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
                          borderRadius: 6,
                          cursor: 'pointer',
                          transition: 'all 140ms ease',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 설정 */}
                <Link href="/orb/settings" onClick={() => setShowMenu(false)}>
                  <div style={{
                    padding: '7px 12px',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.70)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    설정
                  </div>
                </Link>

                {/* 로그아웃 */}
                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    textAlign: 'left',
                    fontSize: 13,
                    color: '#f87171',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 8,
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  로그아웃
                </button>
              </div>
            </>
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
