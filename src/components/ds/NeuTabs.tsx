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
    position: 'relative',
    display: 'flex',
    padding: 4,
    borderRadius: 'var(--ou-radius-pill)',
    background: 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-pressed-sm)',
  };

  const tabStyle = (isActive: boolean): CSSProperties => ({
    padding: size === 'sm' ? '6px 14px' : '10px 0',
    flex: '1',
    borderRadius: 'var(--ou-radius-pill)',
    fontSize: size === 'sm' ? 11 : 13,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
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
