'use client';

'use client';

import { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { WidgetGrid, type GridTransition } from '@/components/widgets/WidgetGrid';
import { DockBar } from '@/components/widgets/DockBar';
import dynamicImport from 'next/dynamic';
const UniverseView = dynamicImport(() => import('@/components/widgets/UniverseView').then(m => m.UniverseView), { ssr: false });
const TutorialComplete = dynamicImport(() => import('@/components/tutorial/TutorialComplete').then(m => m.TutorialComplete), { ssr: false });
const SpeechBubble = dynamicImport(() => import('@/components/tutorial/SpeechBubble').then(m => m.SpeechBubble), { ssr: false });
import { useWidgetStore } from '@/stores/widgetStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { TUTORIAL_INITIAL_LAYOUT } from '@/components/widgets/presets';
import { TUTORIAL_STEPS } from '@/data/tutorial';

function getGreetingDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${year} · ${month} · ${day} · ${weekdays[now.getDay()]}`;
}

type Mode = 'dashboard' | 'to-universe' | 'universe' | 'to-dashboard';

const WIDGET_EXIT_DURATION = 600;
const SPHERE_DURATION = 600;
const WIDGET_ENTER_DURATION = 600;

export default function MyPageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    }>
      <MyPage />
    </Suspense>
  );
}

const GREETING_STORAGE_KEY = 'ou-custom-greeting';

function MyPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [editingGreeting, setEditingGreeting] = useState(false);
  const greetingInputRef = useRef<HTMLInputElement>(null);
  const [greetingPos, setGreetingPos] = useState<{ top: number; left: number }>({ top: 168, left: 116 });
  const dragState = useRef<{ startX: number; startY: number; origTop: number; origLeft: number } | null>(null);
  const searchParams = useSearchParams();
  const isReplay = searchParams.get('tutorial') === 'replay';
  const inviteToken = searchParams.get('invite');
  const [mode, setMode] = useState<Mode>('dashboard');
  const currentPageIndex = useWidgetStore(s => s.currentPageIndex);
  const pages = useWidgetStore(s => s.pages);
  const setCurrentPage = useWidgetStore(s => s.setCurrentPage);
  const initAdminLayout = useWidgetStore(s => s.initAdminLayout);
  const setWidgets = useWidgetStore(s => s.setWidgets);
  const timerRef = useRef<NodeJS.Timeout>();

  const tutorialPhase = useTutorialStore(s => s.phase);
  const tutorialStepIndex = useTutorialStore(s => s.stepIndex);
  const startTutorial = useTutorialStore(s => s.startTutorial);
  const skipAll = useTutorialStore(s => s.skipAll);
  const celebrated = useTutorialStore(s => s.celebrated);
  const markCelebrated = useTutorialStore(s => s.markCelebrated);
  const [showTutorialComplete, setShowTutorialComplete] = useState(false);
  const [targetRect, setTargetRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // 튜토리얼 시작: replay param이면 바로 시작, 아니면 DB 체크
  useEffect(() => {
    if (isReplay) {
      // 설정에서 "다시 보기" 클릭한 경우 — DB 체크 없이 바로 시작
      startTutorial();
      setWidgets(TUTORIAL_INITIAL_LAYOUT);
      router.replace('/home'); // query param 제거
      return;
    }
    if (tutorialPhase !== 'idle') return;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase
          .from('profiles')
          .select('tutorial_completed_at')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.tutorial_completed_at) {
              // 이미 완료한 회원 — 로컬 상태만 completed로 (DB 호출 없음)
              useTutorialStore.setState({ phase: 'completed' });
            } else {
              startTutorial();
              setWidgets(TUTORIAL_INITIAL_LAYOUT);
            }
          });
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReplay]);

  // display_name 패칭
  useEffect(() => {
    if (!user?.id) return;
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().from('profiles').select('display_name').eq('id', user.id).single()
        .then(({ data }) => {
          const name = data?.display_name ?? user?.email?.split('@')[0] ?? '회원';
          if (data?.display_name) setDisplayName(data.display_name);
          // 커스텀 인사 없으면 기본값 설정
          const saved = localStorage.getItem(GREETING_STORAGE_KEY);
          setGreetingText(saved ?? `안녕하세요, ${name}님.`);
        });
    });
  }, [user?.id]);

  // 인사 헤더 위치 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ou-greeting-pos');
      if (saved) setGreetingPos(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // 편집 모드 이벤트 구독
  useEffect(() => {
    const handler = (e: Event) => {
      const { editMode } = (e as CustomEvent).detail;
      setIsEditMode(editMode);
      if (!editMode) setEditingGreeting(false);
    };
    window.addEventListener('widget-edit-mode-change', handler);
    return () => window.removeEventListener('widget-edit-mode-change', handler);
  }, []);

  // 편집 모드 진입 시 인풋 포커스
  useEffect(() => {
    if (editingGreeting) greetingInputRef.current?.focus();
  }, [editingGreeting]);

  // 초대 토큰 처리: 가입 직후 A가 공유한 팩트 정보를 B의 프로필에 자동 등록 + A에게 유니 보상
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
          // B의 profiles에 공유된 팩트 필드 반영
          const fields = share.shared_fields as Record<string, string>;
          const profileUpdate: Record<string, string> = {};
          if (fields.name) profileUpdate.display_name = fields.name;
          if (Object.keys(profileUpdate).length > 0) {
            await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
          }
          // 토큰 사용 처리
          await supabase
            .from('profile_shares')
            .update({ used_by: user.id, used_at: new Date().toISOString() })
            .eq('id', share.id);
          // A(sharer)에게 초대 성공 보상 300 UNI (서버사이드 API 호출)
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

  // 튜토리얼 완료/스킵 → 축하 모달 (celebrated 플래그로 중복 방지)
  useEffect(() => {
    if ((tutorialPhase === 'completed' || tutorialPhase === 'skipped') && !celebrated) {
      setShowTutorialComplete(true);
    }
  }, [tutorialPhase, celebrated]);

  // 스포트라이트 + SpeechBubble 위치 추적 (rAF 재시도 — 페이지 네비 후 안정적)
  useEffect(() => {
    if (tutorialPhase !== 'active') { setTargetRect(null); return; }
    let cancelled = false;
    let retries = 0;
    const tryUpdate = () => {
      if (cancelled) return;
      const el = document.querySelector('[data-tutorial-target="ou-view-input"]');
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          return;
        }
      }
      if (retries++ < 30) requestAnimationFrame(tryUpdate);
    };
    requestAnimationFrame(tryUpdate);
    const onResize = () => { retries = 0; tryUpdate(); };
    window.addEventListener('resize', onResize);
    return () => { cancelled = true; window.removeEventListener('resize', onResize); };
  }, [tutorialPhase, tutorialStepIndex]);


  useEffect(() => {
    if (isAdmin && !isLoading) {
      initAdminLayout();
      // 전체 뷰 자동 설치 (멱등성 — 이미 있으면 스킵)
      fetch('/api/views/init-admin', { method: 'POST' }).catch(() => {});
    }
  }, [isAdmin, isLoading, initAdminLayout]);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); router.push('/orb'); }
    };
    const orbHandler = () => router.push('/orb');
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('orb-expand', orbHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('orb-expand', orbHandler);
    };
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

        {/* 인사 헤더 */}
        {showWidgets && (
          <div
            style={{
              position: 'absolute',
              top: greetingPos.top,
              left: greetingPos.left,
              display: 'flex', flexDirection: 'column',
              padding: isEditMode ? '6px 8px' : 0,
              borderRadius: isEditMode ? 8 : 0,
              outline: isEditMode ? '1.5px dashed var(--ou-border-subtle)' : 'none',
              zIndex: 5,
              cursor: isEditMode ? 'grab' : 'default',
              pointerEvents: isEditMode ? 'auto' : 'none',
              userSelect: 'none',
              transition: 'outline 150ms, padding 150ms',
            }}
            onPointerDown={isEditMode ? (e) => {
              if (editingGreeting) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              dragState.current = {
                startX: e.clientX, startY: e.clientY,
                origTop: greetingPos.top, origLeft: greetingPos.left,
              };
            } : undefined}
            onPointerMove={isEditMode ? (e) => {
              if (!dragState.current) return;
              const { startX, startY, origTop, origLeft } = dragState.current;
              setGreetingPos({
                top: origTop + (e.clientY - startY),
                left: origLeft + (e.clientX - startX),
              });
            } : undefined}
            onPointerUp={isEditMode ? (e) => {
              if (!dragState.current) return;
              dragState.current = null;
              (e.currentTarget as HTMLElement).style.cursor = 'grab';
              try {
                localStorage.setItem('ou-greeting-pos', JSON.stringify(greetingPos));
              } catch { /* ignore */ }
            } : undefined}
          >
            {/* 날짜 */}
            <div style={{
              fontSize: 12, letterSpacing: '2px',
              color: 'var(--ou-text-muted)',
              fontFamily: 'var(--ou-font-logo)',
              marginBottom: 8,
            }}>
              {getGreetingDate()}
            </div>

            {/* 인사 텍스트 */}
            {editingGreeting ? (
              <input
                ref={greetingInputRef}
                value={greetingText}
                onChange={e => setGreetingText(e.target.value)}
                onPointerDown={e => e.stopPropagation()}
                onBlur={() => {
                  localStorage.setItem(GREETING_STORAGE_KEY, greetingText);
                  setEditingGreeting(false);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    localStorage.setItem(GREETING_STORAGE_KEY, greetingText);
                    setEditingGreeting(false);
                  }
                }}
                style={{
                  fontSize: 30, fontWeight: 700,
                  color: 'var(--ou-text-bright)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1.5px solid var(--ou-border-subtle)',
                  outline: 'none',
                  width: '100%',
                  minWidth: 200,
                  padding: '2px 0',
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <div
                onClick={() => isEditMode && setEditingGreeting(true)}
                style={{
                  fontSize: 30, fontWeight: 700,
                  color: 'var(--ou-text-bright)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  cursor: isEditMode ? 'text' : 'default',
                  whiteSpace: 'nowrap',
                }}
              >
                {greetingText || `안녕하세요, ${displayName || user?.email?.split('@')[0] || '회원'}님.`}
              </div>
            )}
          </div>
        )}

        <div style={{
          position: 'absolute',
          top: 248, bottom: 228, left: 116, right: 40,
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

      {/* 튜토리얼 완료 모달 */}
      {showTutorialComplete && (
        <TutorialComplete onClose={() => { setShowTutorialComplete(false); markCelebrated(); }} />
      )}

      {/* 튜토리얼 스포트라이트 + SpeechBubble */}
      {targetRect && tutorialPhase === 'active' && (
        <>
          {/* 스포트라이트 오버레이 — 타겟만 밝게, 나머지 dim */}
          <div
            style={{
              position: 'fixed',
              top: targetRect.top - 12,
              left: targetRect.left - 12,
              width: targetRect.width + 24,
              height: targetRect.height + 24,
              borderRadius: 'var(--ou-radius-lg)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.25)',
              zIndex: 90,
              pointerEvents: 'none',
              transition: 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              animation: 'ou-fade-in 0.4s ease',
            }}
          />
          {/* SpeechBubble — 타겟 아래, 센터 정렬 */}
          <SpeechBubble
            message={TUTORIAL_STEPS[tutorialStepIndex]?.guideMessage ?? '여기에 입력해보세요'}
            tail="top"
            style={{
              position: 'fixed',
              top: targetRect.top + targetRect.height + 24,
              left: targetRect.left + targetRect.width / 2,
              transform: 'translateX(-50%)',
              zIndex: 100,
            }}
            onSkip={skipAll}
          />
        </>
      )}

      {/* Page indicator dots */}
      {mode === 'dashboard' && pages.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 136, left: 0, right: 0,
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
        position: 'absolute', bottom: 40, left: 0, right: 0, height: 88,
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
