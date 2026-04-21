'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';

const UniverseView = dynamic(
  () => import('@/components/widgets/UniverseView').then(m => m.UniverseView),
  { ssr: false }
);

export default function UniversePage() {
  const router = useRouter();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', background: 'var(--ou-bg)', overflow: 'hidden' }}>
      <UniverseView visible={true} />

      {/* 뒤로가기 */}
      <button
        onClick={() => router.push('/home')}
        title="홈으로"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-raised-sm)',
          cursor: 'pointer',
          color: 'var(--ou-text-muted)',
        }}
      >
        <ArrowLeft size={16} />
      </button>
    </div>
  );
}
