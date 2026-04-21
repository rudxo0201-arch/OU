'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { WidgetGrid, type GridTransition } from '@/components/widgets/WidgetGrid';
import { DockBar } from '@/components/widgets/DockBar';
import dynamic from 'next/dynamic';
const UniverseView = dynamic(() => import('@/components/widgets/UniverseView').then(m => m.UniverseView), { ssr: false });
const OrbFullscreen = dynamic(() => import('@/components/chat/OrbFullscreen').then(m => m.OrbFullscreen), { ssr: false });
import { useWidgetStore } from '@/stores/widgetStore';
import { NeuButton } from '@/components/ds';

type Mode = 'dashboard' | 'to-universe' | 'universe' | 'to-dashboard';

const WIDGET_EXIT_DURATION = 600;
const SPHERE_DURATION = 600;
const WIDGET_ENTER_DURATION = 600;

export default function MyPage() {
  const { user, isLoading, signOut, isAdmin } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('dashboard');
  const [orbExpanded, setOrbExpanded] = useState(false);
  const hasOuWidget = useWidgetStore(s => (s.pages[s.currentPageIndex]?.widgets ?? []).some(w => w.type === 'ou-view'));
  const currentPageIndex = useWidgetStore(s => s.currentPageIndex);
  const pages = useWidgetStore(s => s.pages);
  const setCurrentPage = useWidgetStore(s => s.setCurrentPage);
  const initAdminLayout = useWidgetStore(s => s.initAdminLayout);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isAdmin && !isLoading) initAdminLayout();
  }, [isAdmin, isLoading, initAdminLayout]);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOrbExpanded(prev => !prev); }
    };
    const orbHandler = () => setOrbExpanded(true);
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('orb-expand', orbHandler);
    return () => { window.removeEventListener('keydown', keyHandler); window.removeEventListener('orb-expand', orbHandler); };
  }, []);

  const toggleUniverse = useCallback(() => {
    if (mode === 'to-universe' || mode === 'to-dashboard') return;
    clearTimeout(timerRef.current);
    if (mode === 'dashboard') {
      setMode('to-universe');
      timerRef.current = setTimeout(() => setMode('universe'), WIDGET_EXIT_DURATION + SPHERE_DURATION);
    } else {
      setMode('to-dashboard');
      timerRef.current = setTimeout(() => setMode('dashboard'), SPHERE_DURATION + WIDGET_ENTER_DURATION);
    }
  }, [mode]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    );
  }

  const showWidgets = mode === 'dashboard' || mode === 'to-universe' || mode === 'to-dashboard';
  const showUniverse = mode === 'universe' || mode === 'to-universe' || mode === 'to-dashboard';
  const universeActive = mode === 'universe' || mode === 'to-universe';

  let gridTransition: GridTransition = 'idle';
  if (mode === 'to-universe') gridTransition = 'exiting';
  if (mode === 'to-dashboard') gridTransition = 'entering';

  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden', background: 'var(--ou-bg)' }}>
      {/* Full-bleed content area */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <div style={{
          position: 'absolute',
          top: 56, bottom: 96, left: 32, right: 32,
          visibility: showWidgets ? 'visible' : 'hidden',
          pointerEvents: mode === 'dashboard' ? 'auto' : 'none',
        }}>
          <WidgetGrid transition={gridTransition} />
        </div>

        {showUniverse && <UniverseView visible={mode === 'universe' || mode === 'to-universe'} />}

        {(mode === 'to-universe' || mode === 'to-dashboard') && (
          <ExpandingSphere expanding={mode === 'to-universe'} />
        )}
      </div>

      {/* Menu Bar */}
      <MenuBar
        showLogo={!hasOuWidget}
        email={user?.email}
        onSettings={() => router.push('/settings')}
        onLogout={signOut}
      />

      {/* Orb fullscreen overlay */}
      <OrbFullscreen open={orbExpanded} onClose={() => setOrbExpanded(false)} />

      {/* Page indicator dots */}
      {mode === 'dashboard' && pages.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 100, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 8,
          zIndex: 10, pointerEvents: 'auto',
        }}>
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              style={{
                width: currentPageIndex === i ? 20 : 8,
                height: 8,
                borderRadius: 999,
                background: currentPageIndex === i ? 'var(--ou-text-muted)' : 'var(--ou-text-disabled)',
                transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          ))}
        </div>
      )}

      {/* Dock bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 96,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10, pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <DockBar />
        </div>
      </div>
    </div>
  );
}

function MenuBar({ showLogo, email, onSettings, onLogout }: {
  showLogo: boolean; email?: string; onSettings: () => void; onLogout: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/logo-ou.svg" alt="OU" style={{ height: 20, opacity: 0.6 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <NeuButton variant="ghost" size="sm" onClick={onSettings} style={{ padding: '4px 8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </NeuButton>
        <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>{email?.split('@')[0]}</span>
      </div>
    </div>
  );
}

function ExpandingSphere({ expanding }: { expanding: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, var(--ou-text-muted), var(--ou-border-faint) 70%)',
        boxShadow: '0 0 40px 10px var(--ou-border-faint)',
        animation: expanding
          ? 'sphere-expand 600ms cubic-bezier(0, 0, 0.2, 1) forwards'
          : 'sphere-collapse 600ms cubic-bezier(0.4, 0, 1, 1) forwards',
      }} />
    </div>
  );
}
