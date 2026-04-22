'use client';
import { CSSProperties, ReactNode } from 'react';

interface NeuToastProps {
  children: ReactNode;
  accent?: boolean;
  time?: string;
  style?: CSSProperties;
}

export function NeuToast({ children, accent = true, time, style }: NeuToastProps) {
  const toastStyle: CSSProperties = {
    background: 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-raised-md)',
    borderRadius: 'var(--ou-radius-sm)',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    maxWidth: 360,
    animation: 'ou-fade-in 0.3s ease',
    ...style,
  };

  return (
    <div style={toastStyle}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: accent ? 'var(--ou-accent)' : 'var(--ou-text-muted)',
        flexShrink: 0,
      }} />
      <div style={{ fontSize: 12, color: 'var(--ou-text-strong)', flex: 1 }}>{children}</div>
      {time && <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', flexShrink: 0 }}>{time}</div>}
    </div>
  );
}
