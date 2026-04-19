'use client';

import { useState, useEffect } from 'react';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';
import { ChatPanel } from './ChatPanel';
import { VIEW_REGISTRY, VIEW_LABELS } from '@/components/views/registry';
import { NeuCard, NeuButton, NeuBadge } from '@/components/ds';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OrbFullscreen({ open, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const { messages } = useChatStore();

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const autoViews = messages.filter(
    (m) => m.nodeCreated || (m.hanjaResults && m.hanjaResults.length > 0) || m.youtubeEmbed
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
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              color: 'var(--ou-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            생성된 데이터
          </span>

          {autoViews.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 32 }}>
              <span style={{ fontSize: 13, color: 'var(--ou-text-disabled)', textAlign: 'center', lineHeight: 1.6 }}>
                대화하면<br />여기에 쌓여요
              </span>
            </div>
          ) : (
            autoViews.map((msg) => <AutoViewCard key={msg.id} message={msg} />)
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
          }}
        >
          <ChatPanel autoSendOnOpen />
        </div>

        {/* 우: 호출 뷰 */}
        <RequestedViewPanel />
      </div>
    </div>
  );
}

// ── 자동 뷰 카드 ──
const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '지출', task: '할 일',
  emotion: '감정', idea: '아이디어', habit: '습관',
  knowledge: '지식', relation: '인물', media: '미디어',
};

function AutoViewCard({ message }: { message: ChatMessage }) {
  if (message.nodeCreated) {
    const domain = message.nodeCreated.domain;
    const label = DOMAIN_LABELS[domain] || domain;
    const title = (message.nodeCreated.domain_data?.title as string) || message.content.slice(0, 40) || '데이터';
    return (
      <NeuCard variant="raised" size="sm" style={{ padding: '12px 14px' }}>
        <NeuBadge accent style={{ marginBottom: 6 }}>{label}</NeuBadge>
        <div style={{ fontSize: 14, color: 'var(--ou-text-body)', lineHeight: 1.5 }}>{title}</div>
      </NeuCard>
    );
  }

  if (message.hanjaResults && message.hanjaResults.length > 0) {
    return (
      <NeuCard variant="raised" size="sm" style={{ padding: '12px 14px' }}>
        <NeuBadge accent style={{ marginBottom: 6 }}>한자 {message.hanjaResults.length}자</NeuBadge>
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

// ── 호출된 뷰 패널 ──
function RequestedViewPanel() {
  const { requestedView, setRequestedView } = useChatStore();
  const ViewComponent = requestedView ? VIEW_REGISTRY[requestedView.viewType] : null;
  const viewLabel = requestedView ? (VIEW_LABELS[requestedView.viewType] || requestedView.viewType) : '';

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
          borderBottom: requestedView ? '1px solid var(--ou-border-subtle)' : 'none',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--ou-text-muted)', textTransform: 'uppercase' }}>
          {requestedView ? viewLabel : '호출된 뷰'}
        </span>
        {requestedView && (
          <NeuButton variant="ghost" size="sm" onClick={() => setRequestedView(null)} style={{ padding: '3px 6px', minWidth: 0 }}>
            ✕
          </NeuButton>
        )}
      </div>

      {/* Content */}
      {ViewComponent ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <ViewComponent
            nodes={
              requestedView?.cards
                ? requestedView.cards.map((c, i) => ({
                    id: `card-${i}`,
                    domain: 'knowledge',
                    raw: c.front,
                    domain_data: { question: c.front, answer: c.back, term: c.front, definition: c.back },
                    triples: [{ subject: c.front, predicate: 'is_a', object: c.back }],
                  }))
                : []
            }
            filters={requestedView?.filter}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <span style={{ fontSize: 14, color: 'var(--ou-text-disabled)', textAlign: 'center', lineHeight: 1.8 }}>
            &ldquo;다음주 일정 보여줘&rdquo;<br />같이 요청하면 여기에 표시돼요
          </span>
        </div>
      )}
    </NeuCard>
  );
}
