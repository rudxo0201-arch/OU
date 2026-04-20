'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { TUTORIAL_STEPS } from '@/data/tutorial';
import { ChatPanel, InlineView } from './ChatPanel';
import { ProfileQuestionUI } from './ProfileQuestionUI';
import { VIEW_REGISTRY, VIEW_LABELS } from '@/components/views/registry';
import { NeuCard, NeuButton } from '@/components/ds';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OrbFullscreen({ open, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const { messages, clearRequestedViews } = useChatStore();
  const tutorialPhase = useTutorialStore(s => s.phase);
  const tutorialStepIndex = useTutorialStore(s => s.stepIndex);
  const completeTutorial = useTutorialStore(s => s.completeTutorial);
  const skipAllTutorial = useTutorialStore(s => s.skipAll);

  const isProfileStep = tutorialPhase === 'active' && tutorialStepIndex === 6;
  const currentGuideMessage = (tutorialPhase === 'active' && tutorialStepIndex > 0 && tutorialStepIndex < 6)
    ? TUTORIAL_STEPS[tutorialStepIndex]?.guideMessage
    : undefined;
  // 패널은 Orb가 열릴 때 기준 스냅샷 — 이후 대화로 누적되도록 messages 직접 참조
  const openedRef = useRef(false);

  useEffect(() => {
    if (open) {
      // Orb 열릴 때: 좌우 패널 리셋
      if (!openedRef.current) {
        clearRequestedViews();
        openedRef.current = true;
      }
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      openedRef.current = false;
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [open, clearRequestedViews]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // 좌측 패널: 현재 세션에서 생성된 인라인 뷰 (nodeCreated가 있는 assistant 메시지)
  const createdViews = messages.filter(
    (m) => m.role === 'assistant' && !m.streaming && (m.nodeCreated || (m.hanjaResults && m.hanjaResults.length > 0) || m.youtubeEmbed)
  );

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--ou-bg)',
        opacity: animating ? 1 : 0,
        transition: 'opacity 300ms ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ou-text-muted)',
            letterSpacing: 3,
          }}
        >
          ORB
        </span>
        <NeuButton variant="ghost" size="sm" onClick={onClose} style={{ padding: '5px 8px' }}>
          ✕
        </NeuButton>
      </div>

      {/* 3-panel layout */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          padding: '0 20px 20px',
          gap: 16,
          opacity: animating ? 1 : 0,
          transform: animating ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 300ms ease 150ms, transform 300ms ease 150ms',
        }}
      >
        {/* 좌: 자동 뷰 모음 */}
        <NeuCard
          variant="raised"
          size="sm"
          style={{
            flex: 1,
            minWidth: 280,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 2,
              color: 'var(--ou-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            생성된 데이터
          </span>

          {createdViews.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 32 }}>
              <span style={{ fontSize: 15, color: 'var(--ou-text-disabled)', textAlign: 'center', lineHeight: 1.6 }}>
                대화하면<br />여기에 쌓여요
              </span>
            </div>
          ) : (
            createdViews.map((msg) => <CreatedViewCard key={msg.id} message={msg} />)
          )}
        </NeuCard>

        {/* 중: Orb 대화 */}
        <div
          style={{
            flex: 1.2,
            minWidth: 0,
            borderRadius: 'var(--ou-radius-md)',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-pressed-lg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 튜토리얼 가이드 메시지 (Step 2~6) */}
          {currentGuideMessage && (
            <div style={{
              padding: '10px 16px 0',
              flexShrink: 0,
            }}>
              <div style={{
                padding: '10px 16px',
                borderRadius: 12,
                background: 'var(--ou-accent, #e8976b)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                lineHeight: 1.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <span>{currentGuideMessage}</span>
                <button
                  onClick={skipAllTutorial}
                  style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.4)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  건너뛰기
                </button>
              </div>
            </div>
          )}

          {isProfileStep ? (
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <ProfileQuestionUI
                onSubmit={() => { completeTutorial(); onClose(); }}
                onSkip={() => { skipAllTutorial(); onClose(); }}
              />
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0 }}>
              <ChatPanel autoSendOnOpen />
            </div>
          )}
        </div>

        {/* 우: View 패널 (A/B 뷰 통합) */}
        <ViewPanel />
      </div>
    </div>
  );
}

// ── 생성된 뷰 카드 — ChatPanel의 InlineView를 그대로 재사용 ──
function CreatedViewCard({ message }: { message: ChatMessage }) {
  if (message.nodeCreated) {
    return (
      <NeuCard variant="raised" size="sm" style={{ padding: '12px 14px' }}>
        <InlineView
          domain={message.nodeCreated.domain}
          data={message.nodeCreated.domain_data as Record<string, unknown> | undefined}
          content={message.content}
        />
      </NeuCard>
    );
  }

  if (message.hanjaResults && message.hanjaResults.length > 0) {
    return (
      <NeuCard variant="raised" size="sm" style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 8 }}>漢 한자 {message.hanjaResults.length}자</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {message.hanjaResults.slice(0, 8).map((h) => (
            <span
              key={h.char}
              style={{
                fontSize: 18,
                padding: '4px 8px',
                borderRadius: 'var(--ou-radius-sm)',
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-raised-xs)',
                color: 'var(--ou-text-heading)',
              }}
            >
              {h.char}
            </span>
          ))}
          {message.hanjaResults.length > 8 && (
            <span style={{ fontSize: 12, color: 'var(--ou-text-disabled)', alignSelf: 'center' }}>
              +{message.hanjaResults.length - 8}
            </span>
          )}
        </div>
      </NeuCard>
    );
  }

  if (message.youtubeEmbed) {
    return (
      <NeuCard variant="raised" size="sm" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            background: `url(https://img.youtube.com/vi/${message.youtubeEmbed.videoId}/mqdefault.jpg) center/cover`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ fontSize: 20, color: '#fff' }}>▶</span>
          </div>
        </div>
      </NeuCard>
    );
  }

  return null;
}

// viewType → domain 매핑
const VIEW_DOMAIN_MAP: Record<string, string> = {
  calendar: 'schedule',
  todo: 'task',
  chart: 'finance',
  heatmap: 'habit',
  journal: 'emotion',
  timeline: '',
  table: 'knowledge',
  idea: 'idea',
};

// ── View 패널 — A/B 뷰 통합 (회원이 선택한 뷰 쌓임) ──
function ViewPanel() {
  const { requestedViews, clearRequestedViews } = useChatStore();
  const [nodesByView, setNodesByView] = useState<Record<number, any[]>>({});
  const hasViews = requestedViews.length > 0;

  useEffect(() => {
    requestedViews.forEach((rv, idx) => {
      // flashcard이거나 이미 fetch한 경우 스킵
      if (rv.cards || nodesByView[idx] !== undefined) return;

      const domain = VIEW_DOMAIN_MAP[rv.viewType];
      if (domain === undefined) return;

      const params = new URLSearchParams();
      if (domain) params.set('domain', domain);
      params.set('limit', '200');
      // B intent filter 적용
      if (rv.filter) {
        if (rv.filter.days) params.set('days', String(rv.filter.days));
        if (rv.filter.search) params.set('search', String(rv.filter.search));
      }

      fetch(`/api/nodes?${params}`)
        .then(r => r.json())
        .then(data => setNodesByView(prev => ({ ...prev, [idx]: data.nodes || [] })))
        .catch(() => setNodesByView(prev => ({ ...prev, [idx]: [] })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedViews]);

  return (
    <NeuCard
      variant="raised"
      size="sm"
      style={{ flex: 1, minWidth: 280, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: 0 }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: hasViews ? '1px solid var(--ou-border-subtle)' : 'none',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: 'var(--ou-text-muted)', textTransform: 'uppercase' }}>
          View
        </span>
        {hasViews && (
          <NeuButton variant="ghost" size="sm" onClick={clearRequestedViews} style={{ padding: '3px 6px', minWidth: 0, fontSize: 11 }}>
            지우기
          </NeuButton>
        )}
      </div>

      {/* Content */}
      {hasViews ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requestedViews.map((rv, idx) => {
            const ViewComponent = VIEW_REGISTRY[rv.viewType];
            const viewLabel = VIEW_LABELS[rv.viewType] || rv.viewType;
            if (!ViewComponent) return null;

            const nodes = rv.cards
              ? rv.cards.map((c, i) => ({
                  id: `card-${i}`,
                  domain: 'knowledge',
                  raw: c.front,
                  domain_data: { question: c.front, answer: c.back, term: c.front, definition: c.back },
                  triples: [{ subject: c.front, predicate: 'is_a', object: c.back }],
                }))
              : (nodesByView[idx] || []);

            return (
              <div key={idx}>
                <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
                  {viewLabel}
                </div>
                <ViewComponent nodes={nodes} filters={rv.filter} />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <span style={{ fontSize: 15, color: 'var(--ou-text-disabled)', textAlign: 'center', lineHeight: 1.8 }}>
            데이터를 입력하거나<br />조회하면 여기에 표시돼요
          </span>
        </div>
      )}
    </NeuCard>
  );
}

// 뷰타입 → 한국어 레이블 (칩 표시용)
const VIEW_CHIP_LABELS: Record<string, string> = {
  calendar: '캘린더',
  todo: '할 일',
  chart: '차트',
  timeline: '타임라인',
  table: '표',
  heatmap: '히트맵',
  journal: '일기',
  flashcard: '플래시카드',
  boncho: '본초',
  dictionary: '사전',
  idea: '아이디어',
};

// ── 뷰 선택지 칩 — OU 응답 후 채팅 하단에 표시 ──
export function ViewOptionsChips() {
  const { pendingViewOptions, clearPendingViewOptions, addRequestedView } = useChatStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // pendingViewOptions가 바뀌면 선택 초기화
  useEffect(() => {
    setSelected(new Set());
  }, [pendingViewOptions]);

  const toggle = useCallback((vt: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(vt)) next.delete(vt);
      else next.add(vt);
      return next;
    });
  }, []);

  const confirm = useCallback(() => {
    if (!pendingViewOptions) return;
    selected.forEach(vt => {
      addRequestedView({
        viewType: vt,
        filter: pendingViewOptions.filter,
        cards: vt === 'flashcard' ? pendingViewOptions.cards : undefined,
      });
    });
    clearPendingViewOptions();
  }, [pendingViewOptions, selected, addRequestedView, clearPendingViewOptions]);

  if (!pendingViewOptions) return null;

  return (
    <div
      style={{
        margin: '8px 0 4px',
        padding: '12px 14px',
        borderRadius: 'var(--ou-radius-md)',
        background: 'var(--ou-surface)',
        boxShadow: 'var(--ou-neu-raised-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
        뷰 선택
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pendingViewOptions.options.map(vt => {
          const isOn = selected.has(vt);
          return (
            <button
              key={vt}
              onClick={() => toggle(vt)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--ou-radius-sm)',
                border: isOn ? '1.5px solid var(--ou-text-heading)' : '1px solid var(--ou-border-subtle)',
                background: isOn ? 'var(--ou-surface-raised)' : 'transparent',
                color: isOn ? 'var(--ou-text-heading)' : 'var(--ou-text-muted)',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: isOn ? 'var(--ou-neu-raised-xs)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {VIEW_CHIP_LABELS[vt] || vt}
            </button>
          );
        })}
      </div>
      <NeuButton
        variant="accent"
        size="sm"
        onClick={confirm}
        disabled={selected.size === 0}
        style={{ marginTop: 4 }}
      >
        확인
      </NeuButton>
    </div>
  );
}
