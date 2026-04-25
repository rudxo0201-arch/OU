'use client';
import { useState } from 'react';

interface OrbPostProps {
  placeholder?: string;
  onPost?: (text: string) => void;
  onAttach?: () => void;
  submitLabel?: string;
}

export function OrbPost({ placeholder = '무슨 생각을 하고 있나요?', onPost, onAttach, submitLabel = '게시' }: OrbPostProps) {
  const [input, setInput] = useState('');

  const post = () => {
    const text = input.trim();
    if (!text) return;
    onPost?.(text);
    setInput('');
  };

  return (
    <div style={{
      background: 'var(--ou-bg)',
      borderRadius: 'var(--ou-radius-md)',
      boxShadow: 'var(--ou-neu-raised-md)',
      padding: 20,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{
          width: '100%', border: 'none', outline: 'none',
          background: 'transparent',
          color: 'var(--ou-text-strong)',
          fontSize: 15, fontFamily: 'inherit',
          resize: 'vertical', minHeight: 80, lineHeight: 1.6,
        }}
      />
      <div style={{ height: 1, background: 'var(--ou-border-subtle)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onAttach && (
          <button
            onClick={onAttach}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-sm)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 300, color: 'var(--ou-text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--ou-transition)',
            }}
          >+</button>
        )}
        <span style={{ flex: 1 }} />
        <button
          onClick={post}
          disabled={!input.trim()}
          style={{
            padding: '8px 24px',
            borderRadius: 'var(--ou-radius-pill)',
            background: input.trim()
              ? 'linear-gradient(135deg, var(--ou-accent), var(--ou-accent-secondary))'
              : 'var(--ou-bg)',
            boxShadow: input.trim() ? 'var(--ou-neu-raised-sm)' : 'var(--ou-neu-raised-xs)',
            border: 'none',
            color: input.trim() ? '#fff' : 'var(--ou-text-disabled)',
            fontSize: 13, fontWeight: 600,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            transition: 'all var(--ou-transition)',
          }}
        >{submitLabel}</button>
      </div>
    </div>
  );
}
