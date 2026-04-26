'use client';

import { useState, useCallback, useRef } from 'react';
import { ArrowUp, Plus } from 'lucide-react';

type Mode = 'quick' | 'chat';

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
      bottom: 28,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(560px, calc(100vw - 340px))',
      zIndex: 80,
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'var(--ou-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      padding: '14px 16px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {/* 입력 */}
      <textarea
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        rows={1}
        placeholder="just talk !!"
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--ou-text-strong)',
          fontSize: 15,
          fontFamily: 'inherit',
          resize: 'none',
          lineHeight: 1.5,
          opacity: saving ? 0.5 : 1,
        }}
      />

      {/* 하단 버튼 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* 첨부 */}
        <button
          title="첨부"
          style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
          }}
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>

        {/* 모드 토글 */}
        {(['quick', 'chat'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '3px 10px',
              borderRadius: 999,
              border: `1px solid ${mode === m ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.12)'}`,
              background: mode === m ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: mode === m ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              letterSpacing: '0.03em',
              transition: 'all 140ms ease',
            }}
          >
            {m === 'quick' ? 'Quick' : 'Chat mode'}
          </button>
        ))}

        <span style={{ flex: 1 }} />

        {/* 저장 완료 메시지 */}
        {savedMsg && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--ou-font-mono)' }}>
            {savedMsg}
          </span>
        )}

        {/* 전송 */}
        <button
          onClick={() => { submit(input); setInput(''); }}
          disabled={!input.trim() || saving}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            border: 'none',
            background: input.trim() ? '#fff' : 'rgba(255,255,255,0.15)',
            color: input.trim() ? '#111' : 'rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default',
            padding: 0,
            transition: 'all 160ms ease',
          }}
        >
          <ArrowUp size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
