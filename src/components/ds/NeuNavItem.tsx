'use client';
import { CSSProperties, ReactNode } from 'react';

interface NeuNavItemProps {
  children: ReactNode;
  active?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
}

export function NeuNavItem({ children, active = false, icon, onClick }: NeuNavItemProps) {
  const itemStyle: CSSProperties = {
    padding: '10px 14px',
    borderRadius: 'var(--ou-radius-sm)',
    fontSize: 13,
    color: active ? 'var(--ou-accent)' : 'var(--ou-text-secondary)',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all var(--ou-transition)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: active ? 'var(--ou-neu-pressed-sm)' : 'none',
    background: 'var(--ou-bg)',
  };

  return (
    <div style={itemStyle} onClick={onClick}>
      {icon && <span style={{ width: 20, textAlign: 'center' as const }}>{icon}</span>}
      {children}
    </div>
  );
}
