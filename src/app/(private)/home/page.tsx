'use client';

import { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DockBar } from '@/components/widgets/DockBar';
import { QSDTabs } from '@/components/qsd/QSDTabs';
import {
  Note, CalendarBlank, CheckSquare, CurrencyKrw, Fire, Lightbulb,
} from '@phosphor-icons/react';
import dynamicImport from 'next/dynamic';
const UniverseView = dynamicImport(() => import('@/components/widgets/UniverseView').then(m => m.UniverseView), { ssr: false });

type Mode = 'dashboard' | 'to-universe' | 'universe' | 'to-dashboard';

const SPHERE_DURATION = 600;
const WIDGET_EXIT_DURATION = 600;
const WIDGET_ENTER_DURATION = 600;

// 설치된 앱 목록 (완성된 것부터)
const INSTALLED_APPS = [
  { slug: 'note',     label: 'Note',     icon: Note,          route: '/note/new' },
  { slug: 'calendar', label: 'Calendar', icon: CalendarBlank, route: '/app/calendar' },
  { slug: 'todo',     label: 'Todo',     icon: CheckSquare,   route: '/app/todo' },
  { slug: 'finance',  label: 'Finance',  icon: CurrencyKrw,   route: '/app/finance' },
  { slug: 'habit',    label: 'Habit',    icon: Fire,          route: '/app/habit' },
  { slug: 'idea',     label: 'Idea',     icon: Lightbulb,     route: '/app/idea' },
];

export default function HomeWrapper() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}

function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const [mode, setMode] = useState<Mode>('dashboard');
  const timerRef = useRef<NodeJS.Timeout>();

  // 초대 토큰 처리
  useEffect(() => {
    if (!inviteToken || !user) return;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase
        .from('profile_shares')
        .select('id, shared_fields, sharer_id, used_at')
        .eq('token', inviteToken)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single()
        .then(async ({ data: share }) => {
          if (!share) return;
          const fields = share.shared_fields as Record<string, string>;
          const profileUpdate: Record<string, string> = {};
          if (fields.name) profileUpdate.display_name = fields.name;
          if (Object.keys(profileUpdate).length > 0) {
            await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
          }
          await supabase
            .from('profile_shares')
            .update({ used_by: user.id, used_at: new Date().toISOString() })
            .eq('id', share.id);
          if (share.sharer_id) {
            fetch('/api/profile-card/invite-reward', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sharerId: share.sharer_id, shareId: share.id }),
            }).catch(() => {});
          }
        });
    });
    router.replace('/home');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken, user]);

  // Orb 전체화면 이벤트
  useEffect(() => {
    const orbHandler = () => router.push('/orb');
    window.addEventListener('orb-expand', orbHandler);
    return () => window.removeEventListener('orb-expand', orbHandler);
  }, [router]);

  const toggleUniverse = useCallback(() => {
    if (mode === 'to-universe' || mode === 'to-dashboard') return;
    clearTimeout(timerRef.current);
    if (mode === 'dashboard') {
      setMode('to-universe');
      window.dispatchEvent(new CustomEvent('universe-mode-change', { detail: { active: true } }));
      timerRef.current = setTimeout(() => setMode('universe'), WIDGET_EXIT_DURATION + SPHERE_DURATION);
    } else {
      setMode('to-dashboard');
      window.dispatchEvent(new CustomEvent('universe-mode-change', { detail: { active: false } }));
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

  const showDashboard = mode === 'dashboard' || mode === 'to-universe' || mode === 'to-dashboard';
  const showUniverse  = mode === 'universe'   || mode === 'to-universe' || mode === 'to-dashboard';
  const universeActive = mode === 'universe'  || mode === 'to-universe';

  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden', background: 'var(--ou-bg)' }}>

      {/* Universe */}
      {showUniverse && <UniverseView visible={universeActive} />}

      {/* Dashboard */}
      {showDashboard && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 32, padding: '0 24px 120px',
            opacity: mode === 'to-universe' ? 0 : mode === 'to-dashboard' ? 1 : 1,
            transition: 'opacity 400ms ease',
            pointerEvents: mode === 'dashboard' ? 'auto' : 'none',
          }}
        >
          {/* QSD */}
          <div style={{ width: '100%', maxWidth: 560 }}>
            <QSDTabs data-tutorial-target="ou-view-input" />
          </div>

          {/* 앱 아이콘 */}
          <AppGrid />
        </div>
      )}

      {/* Universe 전환 구체 */}
      {(mode === 'to-universe' || mode === 'to-dashboard') && (
        <ExpandingSphere expanding={mode === 'to-universe'} />
      )}

      {/* DockBar */}
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10, pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <DockBar
            onUniverse={toggleUniverse}
            universeActive={universeActive}
          />
        </div>
      </div>
    </div>
  );
}

// ── 앱 아이콘 그리드 ──────────────────────────────────────────
function AppGrid() {
  const router = useRouter();
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
      {INSTALLED_APPS.map(({ slug, label, icon: Icon, route }) => (
        <button
          key={slug}
          onClick={() => router.push(route)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '12px 10px', border: 'none', borderRadius: 'var(--ou-radius-lg)',
            background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
            cursor: 'pointer', width: 72, transition: 'box-shadow 150ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-neu-raised-md)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-neu-raised-sm)'; }}
        >
          <Icon size={22} weight="regular" style={{ color: 'var(--ou-text-muted)' }} />
          <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', letterSpacing: '0.3px' }}>
            {label}
          </span>
        </button>
      ))}
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
