'use client';

import { CSSProperties } from 'react';

interface AmbientBackgroundProps {
  variant?: 'default' | 'auth' | 'home';
}

export function AmbientBackground({ variant = 'default' }: AmbientBackgroundProps) {
  const containerStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle} aria-hidden>
      {/* 플랫 배경 — 그라데이션 오브 제거 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--ou-space-gradient)',
      }} />
    </div>
  );
}
