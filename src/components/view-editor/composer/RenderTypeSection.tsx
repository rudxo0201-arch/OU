'use client';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import { ComposerSection } from './ComposerSection';

const RENDER_TYPES = [
  { key: 'task',      label: '칸반',    icon: '⧉' },
  { key: 'todo',      label: '리스트',  icon: '≡' },
  { key: 'calendar',  label: '캘린더',  icon: '▦' },
  { key: 'timeline',  label: '타임라인',icon: '─' },
  { key: 'table',     label: '테이블',  icon: '⊞' },
  { key: 'heatmap',   label: '히트맵',  icon: '▩' },
  { key: 'chart',     label: '차트',    icon: '△' },
  { key: 'journal',   label: '일기',    icon: '◻' },
];

export function RenderTypeSection() {
  const { viewType, setField } = useViewEditorStore();

  return (
    <ComposerSection number={4} title="렌더 방식">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {RENDER_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setField('viewType', viewType === t.key ? '' : t.key)}
            style={{
              padding: '11px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'var(--ou-bg)',
              boxShadow: viewType === t.key ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-xs)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>{t.icon}</span>
            <span style={{
              fontSize: 12, fontWeight: viewType === t.key ? 600 : 400,
              color: viewType === t.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
            }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </ComposerSection>
  );
}
