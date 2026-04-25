'use client';
import { useState } from 'react';

interface OrbQuickProps {
  placeholder?: string;
  onSubmit?: (text: string) => void;
}

export function OrbQuick({ placeholder = '추가...', onSubmit }: OrbQuickProps) {
  const [input, setInput] = useState('');

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    onSubmit?.(text);
    setInput('');
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-raised-xs)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 300, color: 'var(--ou-text-secondary)',
        flexShrink: 0,
        cursor: 'pointer',
      }}
        onClick={submit}
      >+</div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
        placeholder={placeholder}
        style={{
          flex: 1, border: 'none', outline: 'none',
          background: 'transparent',
          color: 'var(--ou-text-strong)',
          fontSize: 13, fontFamily: 'inherit',
        }}
      />
    </div>
  );
}
