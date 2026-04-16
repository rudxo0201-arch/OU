'use client';

import { Palette, ArrowLeft } from '@phosphor-icons/react';
import { DEFAULT_THEMES } from '@/lib/graph/skins';
import { useRouter } from 'next/navigation';

export default function SkinsMarketPage() {
  const router = useRouter();

  const handleApply = () => {
    // Navigate to login for unauthenticated users
    router.push('/login?next=/market/skins');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => router.push('/market')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6b7280',
          }}
        >
          <ArrowLeft size={16} /> 마켓
        </button>
      </div>

      <div>
        <h2 style={{ margin: 0 }}>내 우주 꾸미기</h2>
        <span style={{ color: 'var(--color-dimmed)', fontSize: 14 }}>테마를 적용해서 나만의 분위기를 만들어보세요</span>
      </div>

      {DEFAULT_THEMES.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Palette size={48} weight="light" color="#9ca3af" />
            <span style={{ fontWeight: 600 }}>준비 중이에요</span>
            <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>곧 다양한 테마가 추가될 예정이에요.</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {DEFAULT_THEMES.map(theme => (
          <div key={theme.id} style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Mini graph preview */}
              <div
                style={{
                  background: theme.background,
                  height: 120,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '0.5px solid var(--color-default-border)',
                }}
              >
                <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                  {[0, 1, 2, 3, 4].map(i => {
                    const angle = (i / 5) * Math.PI * 2;
                    const x = 50 + 30 * Math.cos(angle);
                    const y = 50 + 30 * Math.sin(angle);
                    return (
                      <g key={i}>
                        <line x1="50%" y1="50%" x2={`${x}%`} y2={`${y}%`}
                          stroke={theme.nodeSkin.color}
                          strokeOpacity={theme.edgeSkin.opacity}
                          strokeWidth="0.5"
                        />
                        <circle cx={`${x}%`} cy={`${y}%`} r="3"
                          fill={theme.nodeSkin.color} opacity={0.8}
                        />
                      </g>
                    );
                  })}
                  <circle cx="50%" cy="50%" r="5" fill={theme.nodeSkin.color} opacity="0.9" />
                </svg>
              </div>

              <span style={{ fontWeight: 600 }}>{theme.name}</span>
              <span style={{ fontSize: 12, color: 'var(--color-dimmed)' }}>
                {theme.id === 'space' ? '기본 테마' : '클릭해서 적용해보세요'}
              </span>
              <button
                onClick={handleApply}
                style={{
                  width: '100%', padding: '8px 16px', borderRadius: 6,
                  border: '1px solid #e5e7eb', background: '#f3f4f6',
                  cursor: 'pointer', fontSize: 14,
                }}
              >
                {theme.id === 'space' ? '현재 적용 중' : '적용하기'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
