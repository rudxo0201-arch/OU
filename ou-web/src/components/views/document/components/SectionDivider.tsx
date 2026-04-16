'use client';

import type { DecorationConfig } from '@/types/document-template';

interface SectionDividerProps {
  decoration: DecorationConfig;
}

export function SectionDivider({ decoration }: SectionDividerProps) {
  const { type, color } = decoration.sectionDivider;

  switch (type) {
    case 'line':
      return (
        <div
          style={{
            margin: '20px 0',
            borderBottom: `0.5px solid ${color}`,
          }}
        />
      );

    case 'dots':
      return (
        <div style={{ margin: '20px 0', textAlign: 'center' }}>
          <span style={{ color, letterSpacing: '0.5em', fontSize: 12 }}>
            · · ·
          </span>
        </div>
      );

    case 'ornament':
      return (
        <div style={{ margin: '24px 0', textAlign: 'center' }}>
          <span style={{ color, fontSize: 14, letterSpacing: '0.3em' }}>
            ✦ ✦ ✦
          </span>
        </div>
      );

    case 'space':
      return <div style={{ margin: '32px 0' }} />;

    case 'none':
    default:
      return null;
  }
}
