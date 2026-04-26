'use client';

import { useState, useCallback, useRef } from 'react';
import { ArrowUp } from 'lucide-react';

type Mode = 'quick' | 'search';

export function QSBar() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('quick');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(async (text: string) => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await fetch('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: text.trim() }),
      });
      setSavedMsg('저장됨');
      setTimeout(() => setSavedMsg(''), 1800);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [saving]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      const text = input.trim();
      setInput('');
      submit(text);
    }
  }, [input, submit]);

  return (
    <div style={{
      position: 'fixed',
      bottom: 55,
      left: '50%',
      transform: 'translateX(-50%)',
      /* 키노트 스펙: 620px × 154px */
      width: 620,
      height: 154,
      zIndex: 80,
      borderRadius: 20,
      border: '2.5px solid rgba(255,255,255,0.9)',
      background: '#000',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.15), 0 0 32px rgba(255,255,255,0.22), 0 0 64px rgba(255,255,255,0.08)',
      padding: '20px 24px 16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      {/* 텍스트 입력 */}
      <textarea
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        rows={2}
        placeholder="just talk !!"
        style={{
          width: '100%',
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: '#fff',
          fontSize: 16,
          fontFamily: 'inherit',
          resize: 'none',
          lineHeight: 1.5,
          opacity: saving ? 0.5 : 1,
        }}
      />

      {/* 하단 버튼 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* + 첨부 */}
        <button
          title="첨부"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 24,
            fontWeight: 300,
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          +
        </button>

        <span style={{ flex: 1 }} />

        {/* Search 버튼 (outline) */}
        <button
          onClick={() => setMode('search')}
          style={{
            padding: '6px 20px',
            borderRadius: 999,
            border: `1.5px solid ${mode === 'search' ? '#fff' : 'rgba(255,255,255,0.5)'}`,
            background: mode === 'search' ? 'rgba(255,255,255,0.12)' : 'transparent',
            color: mode === 'search' ? '#fff' : 'rgba(255,255,255,0.6)',
            fontSize: 14,
            fontFamily: 'var(--ou-font-display)',
            cursor: 'pointer',
            transition: 'all 140ms ease',
          }}
        >
          Search
        </button>

        {/* Quick 버튼 (filled = 흰 배경 + 검은 텍스트) */}
        <button
          onClick={() => setMode('quick')}
          style={{
            padding: '6px 20px',
            borderRadius: 999,
            border: 'none',
            background: mode === 'quick' ? '#fff' : 'transparent',
            color: mode === 'quick' ? '#000' : 'rgba(255,255,255,0.6)',
            fontSize: 14,
            fontFamily: 'var(--ou-font-display)',
            cursor: 'pointer',
            transition: 'all 140ms ease',
            ...(mode !== 'quick' ? { border: '1.5px solid rgba(255,255,255,0.5)' } : {}),
          }}
        >
          Quick
        </button>

        {/* 전송 버튼 */}
        {savedMsg ? (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--ou-font-mono)', minWidth: 32, textAlign: 'center' }}>
            {savedMsg}
          </span>
        ) : (
          <button
            onClick={() => { submit(input); setInput(''); }}
            disabled={!input.trim() || saving}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: input.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
              color: input.trim() ? '#000' : 'rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() ? 'pointer' : 'default',
              padding: 0,
              transition: 'all 160ms ease',
              flexShrink: 0,
            }}
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
