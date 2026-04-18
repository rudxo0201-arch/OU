'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ou-quick-memo';

export function QuickMemoWidget() {
  const [text, setText] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setText(saved);
    } catch { /* ignore */ }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch { /* ignore */ }
  };

  return (
    <div className="widget-no-drag" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 12 }}>
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="메모..."
        style={{
          flex: 1,
          resize: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--ou-text-body)',
          fontSize: 13,
          lineHeight: 1.7,
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}
