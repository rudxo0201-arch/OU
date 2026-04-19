'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatPanel } from './ChatPanel';
import { useChatStore } from '@/stores/chatStore';
import { DOMAIN_VIEW_MAP, VIEW_LABELS } from '@/components/views/registry';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OUChatWindow({ open, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  const pendingSent = useRef(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
      pendingSent.current = false;
    } else {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-send pending message when window opens
  useEffect(() => {
    if (open && !pendingSent.current) {
      const pending = useChatStore.getState().pendingMessage;
      if (pending) {
        pendingSent.current = true;
        useChatStore.getState().setPendingMessage(null);
        // Trigger send via ChatInput (will be handled by autoSend prop)
      }
    }
  }, [open]);

  // ⌘+K or ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!visible) return null;

  const messages = useChatStore(s => s.messages);
  const requestedView = useChatStore(s => s.requestedView);

  // 생성된 뷰 아티팩트 — 모든 nodeCreated를 순서대로 수집 (중복 포함)
  const artifacts = messages
    .filter(m => m.role === 'assistant' && m.nodeCreated && !m.streaming)
    .map((m, i) => ({ ...m.nodeCreated!, msgId: m.id, idx: i }));

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // 최신 생성 뷰 또는 선택된 뷰
  const previewArtifact = selectedIdx !== null
    ? artifacts[selectedIdx]
    : requestedView
      ? { domain: requestedView.viewType, domain_data: undefined, nodeId: undefined, confidence: undefined, msgId: '', idx: -1 }
      : artifacts[artifacts.length - 1] ?? null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      transition: 'backdrop-filter 300ms ease, background 300ms ease',
      backdropFilter: animating ? 'blur(12px)' : 'blur(0px)',
      WebkitBackdropFilter: animating ? 'blur(12px)' : 'blur(0px)',
      background: animating ? 'rgba(6,8,16,0.6)' : 'rgba(6,8,16,0)',
    }}>
      {/* Close button */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 24, zIndex: 52,
        width: 36, height: 36, borderRadius: '50%',
        border: '0.5px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: 'rgba(255,255,255,0.4)',
        transition: '180ms ease',
      }}>×</button>

      {/* 3-column layout */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', gap: 0,
        padding: '60px 24px 24px',
        opacity: animating ? 1 : 0,
        transform: animating ? 'scale(1)' : 'scale(0.97)',
        transition: 'opacity 300ms ease, transform 300ms cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Left: 생성된 뷰 목록 */}
        <div style={{
          width: 240, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 8,
          overflowY: 'auto', padding: '0 12px',
        }}>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.25)',
            letterSpacing: 1.5, textTransform: 'uppercase',
            padding: '8px 4px',
          }}>이번 대화에서 생성됨</div>

          {artifacts.length === 0 ? (
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.15)',
              padding: '12px 4px', lineHeight: 1.6,
            }}>
              데이터를 말하면<br />여기에 뷰가 나타나요
            </div>
          ) : (
            artifacts.map((artifact, i) => (
              <CreatedViewCard
                key={artifact.msgId}
                domain={artifact.domain}
                data={artifact.domain_data}
                isSelected={selectedIdx === i || (selectedIdx === null && i === artifacts.length - 1)}
                onClick={() => setSelectedIdx(i)}
              />
            ))
          )}
        </div>

        {/* Center: 채팅 */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          maxWidth: 680, margin: '0 auto',
          borderLeft: '0.5px solid rgba(255,255,255,0.06)',
          borderRight: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <ChatPanel autoSendOnOpen={open} />
        </div>

        {/* Right: 선택된 뷰 프리뷰 */}
        <div style={{
          width: 280, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 8,
          overflowY: 'auto', padding: '0 12px',
        }}>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.25)',
            letterSpacing: 1.5, textTransform: 'uppercase',
            padding: '8px 4px',
          }}>
            {previewArtifact ? (VIEW_LABELS[DOMAIN_VIEW_MAP[previewArtifact.domain] || previewArtifact.domain] || previewArtifact.domain) : '미리보기'}
          </div>

          {previewArtifact ? (
            <ViewPreviewPanel domain={previewArtifact.domain} data={previewArtifact.domain_data} />
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: 'rgba(255,255,255,0.12)',
              padding: 24, textAlign: 'center', lineHeight: 1.6,
            }}>
              왼쪽에서 뷰를<br />선택해주세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 생성된 뷰 카드 (좌측)
const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '지출', task: '할 일',
  emotion: '감정', idea: '아이디어', habit: '습관',
  knowledge: '지식', relation: '인물', media: '미디어',
};

function CreatedViewCard({ domain, data, isSelected, onClick }: {
  domain: string;
  data?: Record<string, any>;
  isSelected: boolean;
  onClick: () => void;
}) {
  // domain_data에서 표시할 제목 추출
  const title = data?.title || data?.what || data?.name || data?.person || '';
  const sub = data?.date || data?.when || data?.amount || data?.category || '';

  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        border: isSelected ? '0.5px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(255,255,255,0.07)',
        background: isSelected ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
        transition: '180ms ease',
        cursor: 'pointer', textAlign: 'left', width: '100%',
      }}
    >
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase' }}>
        {DOMAIN_LABELS[domain] || domain}
      </div>
      {title && (
        <div style={{ fontSize: 12, color: isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
          {title.slice(0, 30)}{title.length > 30 ? '...' : ''}
        </div>
      )}
      {sub && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          {typeof sub === 'number' ? sub.toLocaleString() + '원' : String(sub).slice(0, 20)}
        </div>
      )}
    </button>
  );
}

// 우측 뷰 프리뷰 패널 — 인라인뷰와 동일한 데이터를 더 크게 표시
function ViewPreviewPanel({ domain, data }: { domain: string; data?: Record<string, any> }) {
  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    border: '0.5px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    padding: '24px 28px',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.7,
  };

  if (domain === 'schedule') {
    const title = data?.title || data?.what || '';
    const date = data?.date || data?.when || data?.datetime || '';
    const time = data?.time || data?.start_time || '';
    const location = data?.location || data?.place || '';
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 16 }}>SCHEDULE</div>
        {date && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{date}</div>}
        {time && <div style={{ fontSize: 28, fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginBottom: 8, letterSpacing: -1 }}>{time}</div>}
        {title && <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>{title}</div>}
        {location && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{location}</div>}
      </div>
    );
  }

  if (domain === 'finance') {
    const amount = data?.amount || '';
    const category = data?.category || '';
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 16 }}>FINANCE</div>
        {amount && <div style={{ fontSize: 32, fontWeight: 300, color: 'rgba(255,255,255,0.9)', letterSpacing: -1 }}>
          {typeof amount === 'number' ? amount.toLocaleString() + '원' : amount}
        </div>}
        {category && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>{category}</div>}
      </div>
    );
  }

  const title = data?.title || data?.what || data?.name || '';
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 16 }}>
        {DOMAIN_LABELS[domain]?.toUpperCase() || domain.toUpperCase()}
      </div>
      {title && <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>{title}</div>}
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 16 }}>
        /my 에서 전체 뷰 확인
      </div>
    </div>
  );
}
