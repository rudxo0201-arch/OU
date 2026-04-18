'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatPanel } from './ChatPanel';
import { useChatStore } from '@/stores/chatStore';

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
        {/* Left: 생성된 뷰 목록 (위젯 영역) */}
        <div style={{
          width: 280, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 12,
          overflowY: 'auto', padding: '0 12px',
        }}>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.25)',
            letterSpacing: 1, textTransform: 'uppercase',
            padding: '8px 0',
          }}>생성된 데이터</div>
          <SideWidgetPlaceholder label="캘린더" icon="📅" />
          <SideWidgetPlaceholder label="지출 기록" icon="💰" />
          <SideWidgetPlaceholder label="인물 관계" icon="👤" />
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

        {/* Right: 위젯 영역 (기본: 그래프 미니뷰 + 미리보기) */}
        <div style={{
          width: 280, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 12,
          overflowY: 'auto', padding: '0 12px',
        }}>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.25)',
            letterSpacing: 1, textTransform: 'uppercase',
            padding: '8px 0',
          }}>그래프</div>
          {/* Graph mini placeholder */}
          <div style={{
            aspectRatio: '1', borderRadius: 12,
            border: '0.5px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.015)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.15)', fontSize: 12,
          }}>그래프 미니뷰</div>

          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.25)',
            letterSpacing: 1, textTransform: 'uppercase',
            padding: '8px 0',
          }}>미리보기</div>
          <SideWidgetPlaceholder label="뷰 미리보기" icon="👁" />
        </div>
      </div>
    </div>
  );
}

function SideWidgetPlaceholder({ label, icon }: { label: string; icon: string }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 12,
      border: '0.5px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,255,255,0.01)',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, color: 'rgba(255,255,255,0.35)',
      transition: '180ms ease',
      cursor: 'pointer',
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </div>
  );
}
