'use client';
import { useState } from 'react';

interface OrbCommentProps {
  placeholder?: string;
  onSend?: (text: string) => void;
  avatarLabel?: string;
}

export function OrbComment({ placeholder = '댓글 입력...', onSend, avatarLabel }: OrbCommentProps) {
  const [input, setInput] = useState('');

  const send = () => {
    const text = input.trim();
    if (!text) return;
    onSend?.(text);
    setInput('');
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0',
    }}>
      {avatarLabel && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-raised-xs)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'var(--ou-accent)',
          flexShrink: 0,
        }}>{avatarLabel}</div>
      )}
      <div style={{
        flex: 1,
        background: 'var(--ou-bg)',
        borderRadius: 'var(--ou-radius-pill)',
        boxShadow: 'var(--ou-neu-pressed-sm)',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
          placeholder={placeholder}
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent',
            color: 'var(--ou-text-strong)',
            fontSize: 13, fontFamily: 'inherit',
          }}
        />
        {input.trim() && (
          <button
            onClick={send}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--ou-accent), var(--ou-accent-secondary))',
              boxShadow: 'var(--ou-neu-raised-xs)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
