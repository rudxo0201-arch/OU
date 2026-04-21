'use client';

import { Table, Kanban, CalendarBlank, ListBullets } from '@phosphor-icons/react';
import { VIEW_LABELS } from '../registry';

// 도메인별 사용 가능 뷰 타입
const DOMAIN_VIEW_OPTIONS: Record<string, string[]> = {
  task:     ['task', 'table', 'calendar', 'timeline'],
  schedule: ['calendar', 'table', 'timeline'],
  habit:    ['heatmap', 'table'],
  finance:  ['chart', 'table'],
  idea:     ['idea', 'table'],
  knowledge: ['table', 'flashcard'],
  default:  ['table'],
};

const VIEW_ICONS: Record<string, React.ReactNode> = {
  table:    <Table size={13} />,
  task:     <Kanban size={13} />,
  calendar: <CalendarBlank size={13} />,
  timeline: <ListBullets size={13} />,
  heatmap:  <ListBullets size={13} />,
  chart:    <ListBullets size={13} />,
  idea:     <ListBullets size={13} />,
  flashcard: <ListBullets size={13} />,
};

type Props = {
  domain: string;
  activeViewType: string;
  onSwitch: (viewType: string) => void;
};

export function ViewSwitcher({ domain, activeViewType, onSwitch }: Props) {
  const options = DOMAIN_VIEW_OPTIONS[domain] ?? DOMAIN_VIEW_OPTIONS.default;

  if (options.length <= 1) return null;

  return (
    <div style={{ display: 'flex', gap: 2, padding: '4px 6px' }}>
      {options.map((vt) => {
        const active = vt === activeViewType;
        return (
          <button
            key={vt}
            onClick={() => onSwitch(vt)}
            title={VIEW_LABELS[vt] ?? vt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              border: 'none',
              borderRadius: 'var(--ou-radius-sm)',
              background: active ? 'var(--ou-surface-muted)' : 'transparent',
              boxShadow: active ? 'var(--ou-neu-pressed-sm)' : 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: active ? 'var(--ou-text-bright)' : 'var(--ou-text-muted)',
              transition: 'all var(--ou-transition)',
              whiteSpace: 'nowrap',
            }}
          >
            {VIEW_ICONS[vt] ?? null}
            {VIEW_LABELS[vt] ?? vt}
          </button>
        );
      })}
    </div>
  );
}
