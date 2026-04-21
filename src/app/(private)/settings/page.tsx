'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { GeneralTab } from './GeneralTab';
import { DisplayTab } from './DisplayTab';
import { TutorialTab } from './TutorialTab';
import { AdminTab } from './AdminTab';

type Tab = 'general' | 'display' | 'tutorial' | 'admin';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  general: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24"/></svg>,
  display: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>,
  tutorial: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  admin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2l8 4v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-4z"/></svg>,
};

const TABS: { key: Tab; label: string; adminOnly?: boolean }[] = [
  { key: 'general', label: '일반' },
  { key: 'display', label: '디스플레이' },
  { key: 'tutorial', label: '튜토리얼' },
  { key: 'admin', label: '관리자', adminOnly: true },
];

export default function SettingsPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    if (timedOut && isLoading) router.push('/login');
  }, [timedOut, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
        {timedOut && <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>로그인 페이지로 이동 중...</span>}
      </div>
    );
  }

  if (!user) { router.push('/login'); return null; }

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  const NAV_HEIGHT = 52;

  if (isMobile) {
    return (
      <div style={{ minHeight: '100dvh', paddingTop: NAV_HEIGHT, display: 'flex', flexDirection: 'column', background: 'var(--ou-bg)' }}>
        {/* Mobile: 상단 탭바 */}
        <div style={{
          display: 'flex', gap: 4, padding: '12px 16px',
          borderBottom: '1px solid var(--ou-border-subtle)',
          overflowX: 'auto',
        }}>
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, whiteSpace: 'nowrap',
                fontWeight: activeTab === tab.key ? 600 : 500,
                background: activeTab === tab.key ? 'var(--ou-surface-faint)' : 'transparent',
                border: activeTab === tab.key ? '1px solid var(--ou-border-subtle)' : '1px solid transparent',
                color: activeTab === tab.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>{TAB_ICONS[tab.key]}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <main style={{ flex: 1, padding: '24px 20px 80px' }}>
          {activeTab === 'general' && <GeneralTab user={user} />}
          {activeTab === 'display' && <DisplayTab isMobile={true} />}
          {activeTab === 'tutorial' && <TutorialTab />}
          {activeTab === 'admin' && isAdmin && <AdminTab />}
        </main>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      paddingTop: NAV_HEIGHT,
      display: 'flex',
      background: 'var(--ou-bg)',
    }}>
      {/* Sidebar — 화면 왼쪽 고정 */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        borderRight: '1px solid var(--ou-border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '0 8px' }}>
          <button
            onClick={() => router.back()}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'transparent', border: '1px solid var(--ou-border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--ou-text-secondary)', flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ou-text-bright)', letterSpacing: '-0.01em' }}>설정</span>
        </div>

        {visibleTabs.filter(t => !t.adminOnly).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 14px', fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              fontFamily: 'inherit',
              background: activeTab === tab.key ? 'var(--ou-surface-faint)' : 'transparent',
              border: activeTab === tab.key ? '1px solid var(--ou-border-subtle)' : '1px solid transparent',
              color: activeTab === tab.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ opacity: 0.6, display: 'flex', alignItems: 'center' }}>{TAB_ICONS[tab.key]}</span>
            {tab.label}
          </button>
        ))}

        {/* 관리자 탭 — 하단 분리 */}
        {isAdmin && (
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--ou-border-subtle)' }}>
            <button
              onClick={() => setActiveTab('admin')}
              style={{
                width: '100%', padding: '10px 14px', fontSize: 13,
                fontWeight: activeTab === 'admin' ? 600 : 400,
                borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit',
                background: activeTab === 'admin' ? 'var(--ou-surface-faint)' : 'transparent',
                border: activeTab === 'admin' ? '1px solid var(--ou-border-subtle)' : '1px solid transparent',
                color: activeTab === 'admin' ? 'var(--ou-text-bright)' : 'var(--ou-text-dimmed)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{ opacity: 0.6, display: 'flex', alignItems: 'center' }}>{TAB_ICONS['admin']}</span>
              관리자
            </button>
          </div>
        )}
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: '40px 48px 80px', maxWidth: 760, overflow: 'auto' }}>
        {activeTab === 'general' && <GeneralTab user={user} />}
        {activeTab === 'display' && <DisplayTab isMobile={false} />}
        {activeTab === 'tutorial' && <TutorialTab />}
        {activeTab === 'admin' && isAdmin && <AdminTab />}
      </main>
    </div>
  );
}
