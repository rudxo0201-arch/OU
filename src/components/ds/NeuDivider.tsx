'use client';
import { CSSProperties } from 'react';

interface NeuDividerProps {
  label?: string;
  style?: CSSProperties;
}

export function NeuDivider({ label, style }: NeuDividerProps) {
  if (!label) {
    return <div style={{ height: 1, background: 'var(--ou-border-subtle)', margin: '8px 0', ...style }} />;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0', ...style }}>
      <div style={{ flex: 1, height: 1, background: 'var(--ou-border-subtle)' }} />
      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--ou-border-subtle)' }} />
    </div>
  );
}
