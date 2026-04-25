'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/ou-registry';
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
    if (timedOut && isLoading) router.push(ROUTES.LOGIN);
  }, [timedOut, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
        {timedOut && <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>로그인 페이지로 이동 중...</span>}
      </div>
    );
  }

  if (!user) { router.push(ROUTES.LOGIN); return null; }

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      background: 'var(--ou-bg)',
      padding: isMobile ? 0 : '0 clamp(24px, 8vw, 116px)',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: isMobile ? '100%' : 260,
        flexShrink: 0,
        padding: isMobile ? '16px 16px 0' : '40px 20px',
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        gap: isMobile ? 4 : 6,
        borderBottom: isMobile ? '1px solid var(--ou-border-subtle)' : 'none',
      }}>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, padding: '0 6px' }}>
            <button
              onClick={() => router.back()}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'transparent', border: '1px solid var(--ou-border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--ou-text-secondary)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ou-text-bright)', letterSpacing: '-0.01em' }}>설정</span>
          </div>
        )}

        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: isMobile ? '10px 14px' : '14px 18px',
              fontSize: isMobile ? 13 : 15,
              fontWeight: activeTab === tab.key ? 600 : 500,
              borderRadius: isMobile ? 10 : 12,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              background: activeTab === tab.key ? 'var(--ou-surface-faint)' : 'transparent',
              border: activeTab === tab.key ? '1px solid var(--ou-border-subtle)' : '1px solid transparent',
              color: activeTab === tab.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 6 : 12,
              ...(tab.adminOnly && !isMobile ? { marginTop: 'auto', fontSize: 13, color: activeTab === tab.key ? 'var(--ou-text-bright)' : 'var(--ou-text-dimmed)' } : {}),
            }}
          >
            <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>{TAB_ICONS[tab.key]}</span>
            {!isMobile && tab.label}
            {isMobile && <span style={{ fontSize: 12 }}>{tab.label}</span>}
          </button>
        ))}
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: isMobile ? '24px 20px 80px' : '40px 60px 80px', maxWidth: isMobile ? '100%' : 880, overflow: 'auto' }}>
        {activeTab === 'general' && <GeneralTab user={user} />}
        {activeTab === 'display' && <DisplayTab isMobile={isMobile} />}
        {activeTab === 'tutorial' && <TutorialTab />}
        {activeTab === 'admin' && isAdmin && <AdminTab />}
      </main>
    </div>
  );
}
