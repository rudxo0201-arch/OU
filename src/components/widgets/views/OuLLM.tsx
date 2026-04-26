'use client';

import { useState, useCallback } from 'react';
import { useTutorialStore } from '@/stores/tutorialStore';

export { OuLLM as OuViewWidget };

export function OuLLM() {
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const ghostText = useTutorialStore(s => s.currentGhostText());

  // §7·D-002: 홈 입력바 = inbox 역할. /api/quick 으로 즉시 저장.
  // deep-talk Orb로 라우팅하지 않는다.
  const submitToInbox = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: text.trim() }),
      });
      if (res.ok) {
        setSavedMsg('저장됨');
        setTimeout(() => setSavedMsg(''), 1800);
      }
    } catch {
      // 무시
    } finally {
      setSaving(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      const text = (e.currentTarget.value || input).trim() || ghostText || '';
      if (!text) return;
      setInput('');
      submitToInbox(text);
    }
  }, [input, ghostText, submitToInbox]);

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
          disabled={saving}
          placeholder={showGhost ? '' : '일정, 할 일, 지출, 습관을 기록해보세요'}
          style={{
            width: '100%', border: 'none', outline: 'none',
            background: 'transparent',
            color: 'var(--ou-text-strong)',
            fontSize: 16, fontFamily: 'inherit',
            opacity: saving ? 0.5 : 1,
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
          {savedMsg ? (
            <span style={{ fontSize: 10, color: 'var(--ou-text-secondary)', fontFamily: 'var(--ou-font-mono)' }}>
              {savedMsg}
            </span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', fontFamily: 'var(--ou-font-mono)' }}>
              &#8984;K
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
