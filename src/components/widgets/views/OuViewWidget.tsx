'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { ArrowUpRight } from '@phosphor-icons/react';

export function OuViewWidget() {
  const [input, setInput] = useState('');
  const ghostText = useTutorialStore(s => s.currentGhostText());
  const tutorialPhase = useTutorialStore(s => s.phase);
  const router = useRouter();

  const openOrb = useCallback((text?: string) => {
    if (text) {
      useChatStore.getState().setPendingMessage(text);
    }
    router.push('/orb');
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      const text = (e.currentTarget.value || input).trim();
      setInput('');
      openOrb(text || undefined);
    }
  }, [input, openOrb]);

  const showGhost = !input && !!ghostText;
  const showChip = tutorialPhase === 'active' && !!ghostText && !input;

  return (
    // 외부 div: widget-no-drag 없음 → 카드 테두리 영역에서 드래그 가능
    <div
      data-tutorial-target="ou-view-input"
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      {/* 내부 입력 박스: 입력 관련 요소에만 widget-no-drag */}
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'var(--ou-bg)',
          borderRadius: 'var(--ou-radius-lg)',
          boxShadow: 'var(--ou-neu-pressed-md)',
          padding: '16px 20px 12px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Ghost text */}
        {showGhost && (
          <div style={{
            position: 'absolute',
            top: 16, left: 20,
            fontSize: 16, fontFamily: 'inherit',
            color: 'var(--ou-text-disabled)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            {ghostText}
          </div>
        )}

        {/* 실제 입력 요소 — widget-no-drag */}
        <input
          className="widget-no-drag"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={showGhost ? '' : 'Just talk...'}
          style={{
            width: '100%', border: 'none', outline: 'none',
            background: 'transparent',
            color: 'var(--ou-text-strong)',
            fontSize: 16, fontFamily: 'inherit',
          }}
        />

        {showChip && (
          <button
            className="widget-no-drag"
            onClick={() => openOrb(ghostText!)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 8, marginBottom: 2,
              padding: '3px 10px',
              borderRadius: 999,
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-xs)',
              border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--ou-text-muted)',
              fontFamily: 'inherit',
              maxWidth: '100%', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            <ArrowUpRight size={11} weight="bold" />
            {ghostText}
          </button>
        )}

        <div className="widget-no-drag" style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-raised-xs)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 300, color: 'var(--ou-text-secondary)',
            cursor: 'pointer',
          }}>+</div>
          <span style={{ flex: 1 }} />
          <span style={{
            fontSize: 10, color: 'var(--ou-text-disabled)',
            fontFamily: 'var(--ou-font-mono)',
          }}>&#8984;K</span>
        </div>
      </div>
    </div>
  );
}
