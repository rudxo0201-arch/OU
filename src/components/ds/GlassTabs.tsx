'use client';

import { CSSProperties, ReactNode } from 'react';

interface Tab {
  key: string;
  label: ReactNode;
}

interface GlassTabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  style?: CSSProperties;
}

export function GlassTabs({ tabs, activeKey, onChange, style }: GlassTabsProps) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'rgba(0,0,0,0.04)',
      border: '1px solid var(--ou-glass-border)',
      borderRadius: 'var(--ou-radius-pill)',
      padding: '3px',
      gap: 2,
      ...style,
    }}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 32,
              padding: '0 16px',
              borderRadius: 'var(--ou-radius-pill)',
              fontSize: 'var(--ou-text-sm)',
              fontFamily: 'var(--ou-font-body)',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
              background: isActive ? 'var(--ou-glass-strong)' : 'transparent',
              border: isActive ? '1px solid var(--ou-glass-border-hover)' : '1px solid transparent',
              boxShadow: isActive ? `var(--ou-accent-glow)` : 'none',
              cursor: 'pointer',
              transition: 'all var(--ou-transition-fast)',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
