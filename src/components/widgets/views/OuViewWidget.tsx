'use client';

import { useState, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';

export function OuViewWidget() {
  const [input, setInput] = useState('');

  const openOrb = useCallback((text?: string) => {
    if (text) {
      useChatStore.getState().setPendingMessage(text);
    }
    // 커스텀 이벤트로 /my에 알림 → OrbFullscreen 열기
    window.dispatchEvent(new CustomEvent('orb-expand'));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.trim();
      setInput('');
      openOrb(text || undefined);
    }
  }, [input, openOrb]);

  return (
    <div className="widget-no-drag" style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '0 4px',
    }}>
      {/* OU Logo — inline left */}
      <img src="/logo-ou-white.svg" alt="OU" style={{
        height: 24,
        filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.08))',
        opacity: 0.4,
        flexShrink: 0,
      }} />

      {/* Orb input bar */}
      <div
        onClick={() => !input.trim() && openOrb()}
        style={{
          flex: 1,
          display: 'flex', alignItems: 'center',
          padding: '8px 16px',
          borderRadius: 999,
          border: '1.5px solid rgba(255,255,255,0.7)',
          background: 'transparent',
          boxShadow: '0 0 12px rgba(255,255,255,0.06)',
          cursor: 'text',
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="무엇이든 말해보세요"
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 14, fontFamily: 'inherit',
          }}
        />
        <span style={{
          fontSize: 10, color: 'rgba(255,255,255,0.15)',
          fontFamily: 'monospace', flexShrink: 0,
        }}>⌘K</span>
      </div>
    </div>
  );
}
