'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';
import { ChatPanel } from './ChatPanel';
import { VIEW_REGISTRY, VIEW_LABELS } from '@/components/views/registry';

/**
 * Orb 전체화면 — 3패널 레이아웃
 *
 * 좌: 자동 생성된 인라인 뷰 모음 (INPUT — 새 데이터 확인)
 * 중: Orb 대화 (입력창 가운데)
 * 우: 유저 호출 뷰 (OUTPUT — 기존 데이터 탐색)
 */

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OrbFullscreen({ open, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const { messages } = useChatStore();

  // 오픈/클로즈 애니메이션
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

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // 자동 뷰 수집 (대화에서 nodeCreated/hanjaResults/youtubeEmbed가 있는 메시지)
  const autoViews = messages.filter(m =>
    m.nodeCreated || (m.hanjaResults && m.hanjaResults.length > 0) || m.youtubeEmbed
  );

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(6,8,16,0.97)',
      backdropFilter: 'blur(20px)',
      opacity: animating ? 1 : 0,
      transition: 'opacity 300ms ease',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <span style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 14, fontWeight: 600,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: 3,
        }}>
          ORB
        </span>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '0.5px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 14, color: 'rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          ✕
        </button>
      </div>

      {/* 3-panel layout */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex',
        padding: '0 16px 16px',
        gap: 12,
        opacity: animating ? 1 : 0,
        transform: animating ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 300ms ease 150ms, transform 300ms ease 150ms',
      }}>
        {/* 좌: 자동 뷰 모음 (INPUT) */}
        <div style={{
          width: 260, flexShrink: 0,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
          overflow: 'auto',
          padding: 14,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, marginBottom: 4 }}>
            생성된 데이터
          </span>

          {autoViews.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>
                대화하면 여기에 쌓여요
              </span>
            </div>
          )}

          {autoViews.map(msg => (
            <AutoViewCard key={msg.id} message={msg} />
          ))}
        </div>

        {/* 중: Orb 대화 */}
        <div style={{
          flex: 1, minWidth: 0,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.015)',
          overflow: 'hidden',
        }}>
          <ChatPanel autoSendOnOpen={true} />
        </div>

        {/* 우: 호출 뷰 (OUTPUT) */}
        <RequestedViewPanel />
      </div>
    </div>
  );
}

// ── 자동 뷰 카드 (좌측 패널) ──
const DOMAIN_LABELS: Record<string, string> = {
  schedule: '📅 일정', finance: '💰 지출', task: '☑ 할 일',
  emotion: '💭 감정', idea: '💡 아이디어', habit: '🔄 습관',
  knowledge: '📖 지식', relation: '👤 인물', media: '🎬 미디어',
};

function AutoViewCard({ message }: { message: ChatMessage }) {
  // 노드 생성 카드
  if (message.nodeCreated) {
    const domain = message.nodeCreated.domain;
    const label = DOMAIN_LABELS[domain] || domain;
    const title = message.nodeCreated.domain_data?.title
      || message.content.slice(0, 40)
      || '데이터';

    return (
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        border: '0.5px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', lineHeight: 1.5 }}>
          {title}
        </div>
      </div>
    );
  }

  // 한자 카드
  if (message.hanjaResults && message.hanjaResults.length > 0) {
    return (
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        border: '0.5px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
          漢 한자 {message.hanjaResults.length}자
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {message.hanjaResults.slice(0, 8).map(h => (
            <span key={h.char} style={{
              fontSize: 18, padding: '2px 6px', borderRadius: 4,
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}>
              {h.char}
            </span>
          ))}
          {message.hanjaResults.length > 8 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }}>
              +{message.hanjaResults.length - 8}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 유튜브 카드
  if (message.youtubeEmbed) {
    return (
      <div style={{
        borderRadius: 8, overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          width: '100%', aspectRatio: '16/9',
          background: `url(https://img.youtube.com/vi/${message.youtubeEmbed.videoId}/mqdefault.jpg) center/cover`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
          }}>
            <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)' }}>▶</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── 호출된 뷰 패널 (우측) ──
function RequestedViewPanel() {
  const { requestedView, setRequestedView } = useChatStore();

  const ViewComponent = requestedView ? VIEW_REGISTRY[requestedView.viewType] : null;
  const viewLabel = requestedView ? (VIEW_LABELS[requestedView.viewType] || requestedView.viewType) : '';

  return (
    <div style={{
      width: 300, flexShrink: 0,
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,255,255,0.02)',
      overflow: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: requestedView ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>
          {requestedView ? viewLabel : '호출된 뷰'}
        </span>
        {requestedView && (
          <button
            onClick={() => setRequestedView(null)}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}
          >✕</button>
        )}
      </div>

      {/* Content */}
      {ViewComponent ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <ViewComponent nodes={[]} filters={requestedView?.filter} />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', textAlign: 'center', lineHeight: 1.8 }}>
            "다음주 일정 보여줘"<br />같이 요청하면 여기에 표시돼요
          </span>
        </div>
      )}
    </div>
  );
}
