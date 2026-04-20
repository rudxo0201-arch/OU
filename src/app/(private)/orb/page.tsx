'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { TUTORIAL_STEPS, TUTORIAL_STEP_COUNT } from '@/data/tutorial';
import { ChatPanel, InlineView } from '@/components/chat/ChatPanel';
import { VIEW_REGISTRY, VIEW_LABELS } from '@/components/views/registry';

export default function OrbPage() {
  const { messages, requestedViews, clearRequestedViews, persistGuest, restoreGuest } = useChatStore();

  // 마운트 시 이전 대화 복원
  useEffect(() => {
    restoreGuest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 메시지 변경 시 자동 저장 (스트리밍 중인 메시지 제외)
  useEffect(() => {
    const hasNonStreaming = messages.some(m => !m.streaming);
    if (hasNonStreaming) persistGuest();
  }, [messages, persistGuest]);
  const tutorialPhase = useTutorialStore(s => s.phase);
  const tutorialStepIndex = useTutorialStore(s => s.stepIndex);
  const skipStep = useTutorialStore(s => s.skipStep);
  const router = useRouter();

  const currentGuideMessage = tutorialPhase === 'active'
    ? TUTORIAL_STEPS[tutorialStepIndex]?.guideMessage
    : undefined;

  // Fix 1: /orb 이탈 시 fallback — nodeCreated 생성됐으면 스텝 자동 완료
  useEffect(() => {
    if (tutorialPhase !== 'active') return;
    const snapshot = useChatStore.getState().messages.filter(
      m => m.role === 'assistant' && m.nodeCreated && !m.streaming
    ).length;
    return () => {
      const phase = useTutorialStore.getState().phase;
      if (phase !== 'active') return;
      const current = useChatStore.getState().messages.filter(
        m => m.role === 'assistant' && m.nodeCreated && !m.streaming
      ).length;
      if (current > snapshot) {
        useTutorialStore.getState().completeStep();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialPhase]);

  // 현재 세션에서 생성된 인라인 뷰 (nodeCreated, hanja, youtube)
  const createdViews = messages.filter(
    (m) => m.role === 'assistant' && !m.streaming &&
      (m.nodeCreated || (m.hanjaResults && m.hanjaResults.length > 0) || m.youtubeEmbed)
  );

  const hasContent = createdViews.length > 0 || requestedViews.length > 0;

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--ou-bg)',
      paddingTop: 52, // TopNavBar height
    }}>
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        padding: '12px 40px 20px 116px',
        gap: 16,
      }}>
        {/* 좌: View 패널 */}
        <div style={{
          flex: 1.4,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {hasContent ? (
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexWrap: 'wrap',
              alignContent: 'flex-start',
              gap: 12,
              padding: '4px 2px',
            }}>
              {createdViews.map((msg, i) => (
                <CreatedViewCard key={i} message={msg} />
              ))}
              <RequestedViewPanel />
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 15,
                color: 'var(--ou-text-disabled)',
                textAlign: 'center',
                lineHeight: 1.8,
              }}>
                대화하면<br />여기에 쌓여요
              </span>
            </div>
          )}
        </div>

        {/* 우: Orb 채팅 */}
        <div style={{
          width: 420,
          flexShrink: 0,
          borderRadius: 'var(--ou-radius-lg)',
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-inset)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* 튜토리얼 가이드 */}
          {currentGuideMessage && (
            <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                {Array.from({ length: TUTORIAL_STEP_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === tutorialStepIndex ? 16 : 6,
                      height: 6,
                      borderRadius: 99,
                      background: i === tutorialStepIndex
                        ? 'var(--ou-text-secondary)'
                        : i < tutorialStepIndex
                          ? 'var(--ou-text-muted)'
                          : 'var(--ou-border-faint)',
                      transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                ))}
                <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginLeft: 4 }}>
                  {tutorialStepIndex + 1} / {TUTORIAL_STEP_COUNT}
                </span>
              </div>
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-raised-sm)',
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--ou-text-body)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <span>{currentGuideMessage}</span>
                <button
                  onClick={() => { skipStep(); router.push('/home'); }}
                  style={{
                    fontSize: 11, color: 'var(--ou-text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  건너뛰기
                </button>
              </div>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatPanel autoSendOnOpen />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 생성된 뷰 카드 ──
function CreatedViewCard({ message }: { message: ChatMessage }) {
  const flatCardStyle = {
    padding: '12px 14px',
    borderRadius: 'var(--ou-radius-md)',
    background: 'var(--ou-surface-faint)',
    border: '1px solid var(--ou-border-subtle)',
    flexShrink: 0 as const,
  };

  if (message.nodeCreated) {
    return (
      <div style={flatCardStyle}>
        <InlineView
          domain={message.nodeCreated.domain}
          data={message.nodeCreated.domain_data as Record<string, unknown> | undefined}
          content={message.content}
          viewType={message.nodeCreated.viewType}
        />
      </div>
    );
  }

  if (message.hanjaResults && message.hanjaResults.length > 0) {
    return (
      <div style={flatCardStyle}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 8 }}>
          漢 한자 {message.hanjaResults.length}자
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {message.hanjaResults.slice(0, 8).map((h) => (
            <span key={h.char} style={{
              fontSize: 18, padding: '4px 8px',
              borderRadius: 'var(--ou-radius-sm)',
              border: '1px solid var(--ou-border-subtle)',
              color: 'var(--ou-text-heading)',
            }}>
              {h.char}
            </span>
          ))}
          {message.hanjaResults.length > 8 && (
            <span style={{ fontSize: 12, color: 'var(--ou-text-disabled)', alignSelf: 'center' }}>
              +{message.hanjaResults.length - 8}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (message.youtubeEmbed) {
    return (
      <div style={{ borderRadius: 'var(--ou-radius-md)', border: '1px solid var(--ou-border-subtle)', overflow: 'hidden', width: 240, flexShrink: 0 }}>
        <div style={{
          width: '100%', aspectRatio: '16/9',
          background: `url(https://img.youtube.com/vi/${message.youtubeEmbed.videoId}/mqdefault.jpg) center/cover`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <span style={{ fontSize: 20, color: '#fff' }}>▶</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── 요청된 뷰 (VIEW_REGISTRY 기반) ──
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

function RequestedViewPanel() {
  const { requestedViews } = useChatStore();
  const [nodesByView, setNodesByView] = useState<Record<number, any[]>>({});

  useEffect(() => {
    requestedViews.forEach((rv, idx) => {
      if (rv.cards || nodesByView[idx] !== undefined) return;
      const domain = VIEW_DOMAIN_MAP[rv.viewType];
      if (domain === undefined) return;
      const params = new URLSearchParams();
      if (domain) params.set('domain', domain);
      params.set('limit', '200');
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
    <>
      {requestedViews.map((rv, idx) => {
        const ViewComponent = VIEW_REGISTRY[rv.viewType];
        if (!ViewComponent) return null;
        const viewLabel = VIEW_LABELS[rv.viewType] || rv.viewType;
        const nodes = rv.cards ? rv.cards : (nodesByView[idx] || []);
        return (
          <div key={idx} style={{
            padding: '12px 14px',
            borderRadius: 'var(--ou-radius-md)',
            background: 'var(--ou-surface-faint)',
            border: '1px solid var(--ou-border-subtle)',
            flexShrink: 0,
            minWidth: 240,
          }}>
            <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
              {viewLabel}
            </div>
            <ViewComponent nodes={nodes} filters={rv.filter} />
          </div>
        );
      })}
    </>
  );
}
