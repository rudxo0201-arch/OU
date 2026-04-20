'use client';
import { ReactNode } from 'react';

interface Props {
  number: number;
  title: string;
  children: ReactNode;
}

export function ComposerSection({ number, title, children }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'var(--ou-text-muted)',
        }}>
          {number}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-secondary)', letterSpacing: '0.02em' }}>
          {title}
        </span>
      </div>
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
      }}>
        {children}
      </div>
    </div>
  );
}
