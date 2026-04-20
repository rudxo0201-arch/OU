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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.trim();
      setInput('');
      openOrb(text || undefined);
    }
  }, [input, openOrb]);

  // 타이핑 시작하면 ghost text는 사라짐 (input이 있으면 placeholder 숨김)
  const showGhost = !input && !!ghostText;
  const showChip = tutorialPhase === 'active' && !!ghostText && !input;

  return (
    <div
      data-tutorial-target="ou-view-input"
      className="widget-no-drag"
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      {/* Orb 입력 — pressed (안쪽으로 들어간 입력창) */}
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: 'var(--ou-bg)',
        borderRadius: 'var(--ou-radius-lg)',
        boxShadow: 'var(--ou-neu-pressed-md)',
        padding: '16px 20px 12px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Ghost text 레이어 */}
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
        <input
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
        {/* 튜토리얼 제안 칩 — 탭 하나로 전송 */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 10 }}>
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
