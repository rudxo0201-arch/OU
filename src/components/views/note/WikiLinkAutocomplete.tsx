'use client';

import { useEffect, useState, useRef } from 'react';
import { useNoteStore } from '@/stores/noteStore';

type Props = {
  query: string;
  style?: React.CSSProperties;
  onSelect: (pageId: string, title: string) => void;
  onClose: () => void;
};

export function WikiLinkAutocomplete({ query, style, onSelect, onClose }: Props) {
  const { pages } = useNoteStore();
  const [activeIndex, setActiveIndex] = useState(0);

  // 퍼지 필터
  const filtered = pages
    .filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIndex]) { onSelect(filtered[activeIndex].id, filtered[activeIndex].title); } }
      else if (e.key === 'Escape') { onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, activeIndex, onSelect, onClose]);

  if (filtered.length === 0) {
    return (
      <div style={{ ...containerStyle, ...style }}>
        <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--ou-text-muted)' }}>
          {query ? `"${query}" 페이지 없음` : '페이지를 검색하세요'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, ...style }}>
      {filtered.map((page, i) => (
        <button
          key={page.id}
          onMouseEnter={() => setActiveIndex(i)}
          onClick={() => onSelect(page.id, page.title)}
          style={{
            display: 'block',
            width: '100%',
            padding: '6px 10px',
            border: 'none',
            borderRadius: 'var(--ou-radius-sm)',
            background: i === activeIndex ? 'var(--ou-surface-muted)' : 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 13,
            color: 'var(--ou-text-bright)',
            transition: 'background var(--ou-transition)',
          }}
        >
          {page.title || '제목 없음'}
        </button>
      ))}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 1001,
  background: 'var(--ou-bg)',
  borderRadius: 'var(--ou-radius-md)',
  boxShadow: 'var(--ou-neu-raised-md)',
  padding: 4,
  minWidth: 220,
  maxHeight: 260,
  overflowY: 'auto',
};
