'use client';
import { CSSProperties } from 'react';

interface NeuTabsProps {
  tabs: string[];
  active: number;
  onChange?: (index: number) => void;
  size?: 'sm' | 'md';
}

export function NeuTabs({ tabs, active, onChange, size = 'md' }: NeuTabsProps) {
  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    gap: 3,
    background: 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-pressed-sm)',
    borderRadius: 'var(--ou-radius-pill)',
    padding: 3,
  };

  const tabStyle = (isActive: boolean): CSSProperties => ({
    padding: size === 'sm' ? '6px 14px' : '8px 20px',
    borderRadius: 'var(--ou-radius-pill)',
    fontSize: size === 'sm' ? 11 : 12,
    fontWeight: 600,
    color: isActive ? 'var(--ou-accent)' : 'var(--ou-text-muted)',
    background: isActive ? 'var(--ou-bg)' : 'transparent',
    boxShadow: isActive ? 'var(--ou-neu-raised-sm)' : 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'all var(--ou-transition)',
    fontFamily: 'inherit',
  });

  return (
    <div style={containerStyle}>
      {tabs.map((tab, i) => (
        <button key={tab} style={tabStyle(i === active)} onClick={() => onChange?.(i)}>
          {tab}
        </button>
      ))}
    </div>
  );
}
