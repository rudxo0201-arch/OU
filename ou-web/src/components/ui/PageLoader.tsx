'use client';

import { OULoader } from './OULoader';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = '불러오는 중...' }: PageLoaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <OULoader variant="ripple" size="lg" />
        <span style={{ fontSize: 14, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))' }}>{message}</span>
      </div>
    </div>
  );
}
