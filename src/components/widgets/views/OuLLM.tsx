'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { ROUTES, ORB_SLUGS } from '@/lib/ou-registry';


export { OuLLM as OuViewWidget };

export function OuLLM() {
  const [input, setInput] = useState('');
  const ghostText = useTutorialStore(s => s.currentGhostText());
  const router = useRouter();

  useEffect(() => { router.prefetch(ROUTES.ORB(ORB_SLUGS.DEEP_TALK)); }, [router]);

  const openOrb = useCallback((text?: string) => {
    if (text) {
      useChatStore.getState().setPendingMessage(text);
    }
    router.push(ROUTES.ORB(ORB_SLUGS.DEEP_TALK));
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      const text = (e.currentTarget.value || input).trim() || ghostText || undefined;
      setInput('');
      openOrb(text);
    }
  }, [input, ghostText, openOrb]);

  const showGhost = !input && !!ghostText;

  return (
    <div
      data-tutorial-target="ou-view-input"
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
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
          className="widget-no-drag"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={showGhost ? '' : '일정, 할 일, 지출, 습관을 기록해보세요'}
          style={{
            width: '100%', border: 'none', outline: 'none',
            background: 'transparent',
            color: 'var(--ou-text-strong)',
            fontSize: 16, fontFamily: 'inherit',
          }}
        />

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
