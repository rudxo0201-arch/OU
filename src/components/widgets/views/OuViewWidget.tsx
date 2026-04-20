'use client';

import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';

export function OuViewWidget() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/orb');
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 20px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--ou-accent)',
          boxShadow: '0 0 6px var(--ou-accent)',
          animation: 'blink 2s ease-in-out infinite',
        }} />
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: 'var(--ou-text-muted)',
          letterSpacing: '0.06em',
          fontFamily: 'var(--ou-font-logo)',
          textTransform: 'uppercase',
        }}>
          ORB · 대기 중
        </span>
      </div>

      {/* 원형 그라데이션 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 88, height: 88,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 38%, rgba(var(--ou-accent-rgb, 230,160,100), 0.9) 0%, rgba(var(--ou-accent-rgb, 220,140,90), 0.6) 50%, rgba(var(--ou-accent-rgb, 210,130,80), 0.2) 100%)',
          boxShadow: 'var(--ou-neu-pressed-md)',
          animation: 'float 4s ease-in-out infinite',
        }} />
      </div>

      {/* 하단: Just talk. + 웨이브폼 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 14, fontWeight: 400,
          color: 'var(--ou-text-body)',
          letterSpacing: '0.04em',
        }}>
          Just talk.
        </span>

        {/* 웨이브폼 바 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 20 }}>
          {[0.4, 0.7, 1.0, 0.6, 0.3].map((scale, i) => (
            <div
              key={i}
              style={{
                width: 3,
                height: `${scale * 100}%`,
                borderRadius: 2,
                background: 'var(--ou-accent)',
                opacity: 0.6,
                animation: `waveform-${i} ${0.8 + i * 0.12}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
          <style>{`
            @keyframes waveform-0 { from { height: 20% } to { height: 70% } }
            @keyframes waveform-1 { from { height: 40% } to { height: 90% } }
            @keyframes waveform-2 { from { height: 60% } to { height: 100% } }
            @keyframes waveform-3 { from { height: 30% } to { height: 80% } }
            @keyframes waveform-4 { from { height: 15% } to { height: 55% } }
          `}</style>
        </div>
      </div>
    </div>
  );
}
