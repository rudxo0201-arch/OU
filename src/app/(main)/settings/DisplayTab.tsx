'use client';

import { useState } from 'react';
import { useWidgetStore } from '@/stores/widgetStore';
import { GRID_PRESETS, type GridPreset } from '@/components/widgets/types';
import { Section } from './_shared';

const PALETTES = [
  { key: 'sunrise', label: 'Sunrise', gradient: 'linear-gradient(135deg, #f4b896, #f9d49a)' },
  { key: 'arctic', label: 'Arctic', gradient: 'linear-gradient(135deg, #a4c2ec, #a8d6e0)' },
  { key: 'blossom', label: 'Blossom', gradient: 'linear-gradient(135deg, #e8b8c4, #f0cdd8)' },
  { key: 'forest', label: 'Forest', gradient: 'linear-gradient(135deg, #a8d8b8, #c4dec8)' },
  { key: 'dusk', label: 'Dusk', gradient: 'linear-gradient(135deg, #b8afd8, #d0c8f0)' },
  { key: 'stone', label: 'Stone', gradient: 'linear-gradient(135deg, #c4c4c4, #d8d8d8)' },
];

const THEMES = [
  { key: 'light' as const, label: '라이트', sub: '부드러운 뉴모피즘', previewBg: '#e8ecf1' },
  { key: 'dark' as const, label: '다크', sub: '그라파이트 우주', previewBg: '#2a2d3e' },
];

export function DisplayTab({ isMobile }: { isMobile: boolean }) {
  const store = useWidgetStore();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined') return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'light';
    return 'light';
  });
  const [palette, setPalette] = useState(() => {
    if (typeof document !== 'undefined') return document.documentElement.getAttribute('data-palette') || 'sunrise';
    return 'sunrise';
  });

  const applyTheme = (t: 'dark' | 'light') => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('ou-theme', t);
  };

  const applyPalette = (p: string) => {
    setPalette(p);
    document.documentElement.setAttribute('data-palette', p);
    localStorage.setItem('ou-palette', p);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Section title="테마">
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14 }}>
          {THEMES.map(t => (
            <button
              key={t.key}
              onClick={() => applyTheme(t.key)}
              style={{
                flex: 1, padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
                background: theme === t.key ? 'var(--ou-surface-faint)' : 'transparent',
                border: theme === t.key ? '1.5px solid var(--ou-border-medium)' : '1px solid var(--ou-border-subtle)',
                textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: t.previewBg }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <b style={{ fontSize: 13, color: 'var(--ou-text-bright)', fontWeight: 600 }}>{t.label}</b>
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>{t.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="컬러 팔레트" sub="· 어시스턴트 강조색">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: 14 }}>
          {PALETTES.map(p => (
            <button
              key={p.key}
              onClick={() => applyPalette(p.key)}
              style={{
                padding: '16px 10px 14px', borderRadius: 14, cursor: 'pointer',
                background: palette === p.key ? 'var(--ou-surface-faint)' : 'transparent',
                border: palette === p.key ? '1.5px solid var(--ou-border-medium)' : '1px solid var(--ou-border-subtle)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: p.gradient }} />
              <span style={{
                fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.8px',
                color: palette === p.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
                fontWeight: palette === p.key ? 600 : 400,
              }}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="홈 화면 그리드">
        <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', lineHeight: 1.8, marginBottom: 12 }}>위젯 배치 그리드의 크기를 조절합니다.</p>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14 }}>
          {(Object.entries(GRID_PRESETS) as [GridPreset, typeof GRID_PRESETS[GridPreset]][]).map(([key, preset]) => {
            const isActive = store.gridCols === preset.cols && store.gridRows === preset.rows;
            return (
              <button
                key={key}
                onClick={() => store.setGridSize(preset.cols, preset.rows)}
                style={{
                  flex: 1, padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
                  background: isActive ? 'var(--ou-surface-faint)' : 'transparent',
                  border: isActive ? '1.5px solid var(--ou-border-medium)' : '1px solid var(--ou-border-subtle)',
                  textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${preset.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${preset.rows}, 1fr)`,
                  gap: 1, padding: 4,
                  background: 'var(--ou-surface-faint)',
                }}>
                  {Array.from({ length: preset.cols * preset.rows }).map((_, i) => (
                    <div key={i} style={{ borderRadius: 1, background: 'var(--ou-text-disabled)', opacity: 0.3 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <b style={{ fontSize: 13, color: 'var(--ou-text-bright)', fontWeight: 600 }}>{preset.label}</b>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>{preset.sub}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', marginBottom: 8 }}>미리보기</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${store.gridCols}, 1fr)`, gridTemplateRows: `repeat(${store.gridRows}, 1fr)`, gap: 3, aspectRatio: '16/10' }}>
            {Array.from({ length: store.gridCols * store.gridRows }).map((_, i) => (
              <div key={i} style={{ borderRadius: 3, background: 'var(--ou-border-faint)' }} />
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
