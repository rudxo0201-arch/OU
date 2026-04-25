'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatPanel } from './ChatPanel';
import { useChatStore } from '@/stores/chatStore';
import { DOMAIN_VIEW_MAP, VIEW_LABELS } from '@/components/views/registry';
import { NeuButton, NeuBadge, NeuCard } from '@/components/ds';

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

  useEffect(() => {
    if (open && !pendingSent.current) {
      const pending = useChatStore.getState().pendingMessage;
      if (pending) {
        pendingSent.current = true;
        useChatStore.getState().setPendingMessage(null);
      }
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!visible) return null;

  const messages = useChatStore(s => s.messages);
  const requestedViews = useChatStore(s => s.requestedViews);
  const lastRequestedView = requestedViews[requestedViews.length - 1] ?? null;

  const artifacts = messages
    .filter(m => m.role === 'assistant' && m.nodeCreated && !m.streaming)
    .map((m, i) => ({ ...m.nodeCreated!, msgId: m.id, idx: i }));

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const previewArtifact = selectedIdx !== null
    ? artifacts[selectedIdx]
    : lastRequestedView
      ? { domain: lastRequestedView.viewType, domain_data: undefined, nodeId: undefined, confidence: undefined, msgId: '', idx: -1 }
      : artifacts[artifacts.length - 1] ?? null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: animating ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
      backdropFilter: animating ? 'blur(12px)' : 'blur(0px)',
      WebkitBackdropFilter: animating ? 'blur(12px)' : 'blur(0px)',
      transition: 'background 300ms ease, backdrop-filter 300ms ease',
    }}>
      {/* Close button */}
      <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 52 }}>
        <NeuButton variant="ghost" size="sm" onClick={onClose} style={{ padding: '6px 10px' }}>
          ✕
        </NeuButton>
      </div>

      {/* 3-column layout */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', gap: 0,
        padding: '56px 24px 24px',
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
            fontSize: 10, color: 'var(--ou-text-disabled)',
            letterSpacing: 1.5, textTransform: 'uppercase',
            padding: '8px 4px',
          }}>이번 대화에서 생성됨</div>

          {artifacts.length === 0 ? (
            <div style={{
              fontSize: 12, color: 'var(--ou-text-disabled)',
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
          borderLeft: '1px solid var(--ou-border-faint)',
          borderRight: '1px solid var(--ou-border-faint)',
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
            fontSize: 10, color: 'var(--ou-text-disabled)',
            letterSpacing: 1.5, textTransform: 'uppercase',
            padding: '8px 4px',
          }}>
            {previewArtifact
              ? (VIEW_LABELS[DOMAIN_VIEW_MAP[previewArtifact.domain] || previewArtifact.domain] || previewArtifact.domain)
              : '미리보기'}
          </div>

          {previewArtifact ? (
            <ViewPreviewPanel domain={previewArtifact.domain} data={previewArtifact.domain_data} />
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: 'var(--ou-text-disabled)',
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
  data?: Record<string, unknown>;
  isSelected: boolean;
  onClick: () => void;
}) {
  const title = (data?.title || data?.what || data?.name || data?.person || '') as string;
  const sub = (data?.date || data?.when || data?.amount || data?.category || '') as string | number;

  return (
    <NeuCard
      variant={isSelected ? 'pressed' : 'raised'}
      size="sm"
      style={{
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
        cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: '180ms ease',
      }}
      onClick={onClick}
    >
      <NeuBadge accent={isSelected} style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>
        {DOMAIN_LABELS[domain] || domain}
      </NeuBadge>
      {title && (
        <div style={{ fontSize: 12, color: isSelected ? 'var(--ou-text-body)' : 'var(--ou-text-muted)', lineHeight: 1.4 }}>
          {title.slice(0, 30)}{title.length > 30 ? '...' : ''}
        </div>
      )}
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)' }}>
          {typeof sub === 'number' ? sub.toLocaleString() + '원' : String(sub).slice(0, 20)}
        </div>
      )}
    </NeuCard>
  );
}

// 우측 뷰 프리뷰 패널
function ViewPreviewPanel({ domain, data }: { domain: string; data?: Record<string, unknown> }) {
  if (domain === 'schedule') {
    const title = (data?.title || data?.what || '') as string;
    const date = (data?.date || data?.when || data?.datetime || '') as string;
    const time = (data?.time || data?.start_time || '') as string;
    const location = (data?.location || data?.place || '') as string;
    return (
      <NeuCard variant="raised" style={{ padding: '24px 28px' }}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' }}>Schedule</div>
        {date && <div style={{ fontSize: 13, color: 'var(--ou-text-muted)', marginBottom: 8 }}>{date}</div>}
        {time && <div style={{ fontSize: 28, fontWeight: 300, color: 'var(--ou-text-heading)', marginBottom: 8, letterSpacing: -1 }}>{time}</div>}
        {title && <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ou-text-body)', marginBottom: 6 }}>{title}</div>}
        {location && <div style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>{location}</div>}
      </NeuCard>
    );
  }

  if (domain === 'finance') {
    const amount = (data?.amount || '') as string | number;
    const category = (data?.category || '') as string;
    return (
      <NeuCard variant="raised" style={{ padding: '24px 28px' }}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' }}>Finance</div>
        {amount && (
          <div style={{ fontSize: 32, fontWeight: 300, color: 'var(--ou-text-heading)', letterSpacing: -1 }}>
            {typeof amount === 'number' ? amount.toLocaleString() + '원' : amount}
          </div>
        )}
        {category && <div style={{ fontSize: 13, color: 'var(--ou-text-muted)', marginTop: 8 }}>{category}</div>}
      </NeuCard>
    );
  }

  const title = (data?.title || data?.what || data?.name || '') as string;
  return (
    <NeuCard variant="raised" style={{ padding: '24px 28px' }}>
      <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' }}>
        {DOMAIN_LABELS[domain]?.toUpperCase() || domain.toUpperCase()}
      </div>
      {title && <div style={{ fontSize: 15, color: 'var(--ou-text-body)' }}>{title}</div>}
      <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)', marginTop: 16 }}>
        /my 에서 전체 뷰 확인
      </div>
    </NeuCard>
  );
}
