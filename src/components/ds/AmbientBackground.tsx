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
      {/* 배경 그라데이션 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--ou-space-gradient)',
      }} />

      {/* 좌상단 빛 오브 (파랑) */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '50vw',
        height: '50vw',
        maxWidth: 700,
        maxHeight: 700,
        background: 'radial-gradient(circle, rgba(108, 140, 255, 0.07) 0%, transparent 65%)',
        borderRadius: '50%',
      }} />

      {/* 우하단 빛 오브 (보라) */}
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-5%',
        width: '45vw',
        height: '45vw',
        maxWidth: 600,
        maxHeight: 600,
        background: 'radial-gradient(circle, rgba(167, 139, 250, 0.05) 0%, transparent 65%)',
        borderRadius: '50%',
      }} />

      {/* 중앙 하단 빛 오브 (auth 화면용) */}
      {variant === 'auth' && (
        <div style={{
          position: 'absolute',
          bottom: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '40vw',
          height: '40vw',
          maxWidth: 500,
          maxHeight: 500,
          background: 'radial-gradient(circle, rgba(108, 140, 255, 0.04) 0%, transparent 65%)',
          borderRadius: '50%',
        }} />
      )}
    </div>
  );
}
