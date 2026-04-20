'use client';
import { ReactNode } from 'react';

interface Props {
  number: number;
  title: string;
  children: ReactNode;
}

export function ComposerSection({ number, title, children }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-disabled)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {number}. {title}
      </span>
      <div>{children}</div>
    </div>
  );
}
