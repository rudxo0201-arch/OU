'use client';

import { useState, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useTutorialStore } from '@/stores/tutorialStore';

export function OuViewWidget() {
  const [input, setInput] = useState('');
  const ghostText = useTutorialStore(s => s.currentGhostText());

  const openOrb = useCallback((text?: string) => {
    if (text) {
      useChatStore.getState().setPendingMessage(text);
    }
    window.dispatchEvent(new CustomEvent('orb-expand'));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // 입력이 없으면 ghost text 전송
      const text = input.trim() || ghostText?.trim() || '';
      setInput('');
      openOrb(text || undefined);
    }
  }, [input, ghostText, openOrb]);

  // 타이핑 시작하면 ghost text는 사라짐 (input이 있으면 placeholder 숨김)
  const showGhost = !input && !!ghostText;

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
