'use client';

import { ReactNode } from 'react';

export function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <div style={{ marginBottom: 96 }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--ou-text-muted)',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        marginBottom: 24,
        paddingBottom: 8,
        borderBottom: '0.5px solid var(--ou-border-faint)',
      }}>
        {title}
      </div>
      {note && (
        <p style={{
          fontSize: 12,
          color: 'var(--ou-text-secondary)',
          marginTop: 0,
          marginBottom: 20,
          lineHeight: 1.6,
        }}>
          {note}
        </p>
      )}
      {children}
    </div>
  );
}

export function Grid({ cols, gap = 16, children }: { cols: 2 | 3 | 4; gap?: number; children: ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap,
    }}>
      {children}
    </div>
  );
}

export function SwatchGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {children}
      <div style={{
        fontSize: 9,
        color: 'var(--ou-text-dimmed)',
        textAlign: 'center',
        marginTop: 6,
        wordBreak: 'break-all',
        maxWidth: 80,
      }}>
        {label}
      </div>
    </div>
  );
}
