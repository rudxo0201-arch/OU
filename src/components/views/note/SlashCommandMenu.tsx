'use client';

import { useEffect, useRef, useState } from 'react';
import {
  TextT, ListBullets, ListNumbers, CheckSquare,
  Quotes, Code, Minus, TextHOne, TextHTwo, TextHThree,
} from '@phosphor-icons/react';

export type SlashCommand = {
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
};

type Props = {
  commands: SlashCommand[];
  query: string;
  onClose: () => void;
  style?: React.CSSProperties;
};

export function SlashCommandMenu({ commands, query, onClose, style }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter(
    (c) => c.label.toLowerCase().includes(query.toLowerCase()) ||
           c.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filtered[activeIndex]?.action();
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, activeIndex, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        zIndex: 1000,
        background: 'var(--ou-bg)',
        borderRadius: 'var(--ou-radius-md)',
        boxShadow: 'var(--ou-neu-raised-md)',
        padding: '4px',
        minWidth: 240,
        maxHeight: 280,
        overflowY: 'auto',
        ...style,
      }}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.label}
          onMouseEnter={() => setActiveIndex(i)}
          onClick={() => { cmd.action(); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '7px 10px',
            border: 'none',
            borderRadius: 'var(--ou-radius-sm)',
            background: i === activeIndex ? 'var(--ou-surface-muted)' : 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background var(--ou-transition)',
          }}
        >
          <span style={{ color: 'var(--ou-text-secondary)', flexShrink: 0, lineHeight: 0 }}>
            {cmd.icon}
          </span>
          <span>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ou-text-bright)' }}>
              {cmd.label}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--ou-text-muted)' }}>
              {cmd.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

export const SLASH_COMMAND_ICONS = {
  TextT, ListBullets, ListNumbers, CheckSquare,
  Quotes, Code, Minus, TextHOne, TextHTwo, TextHThree,
};
