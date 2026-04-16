'use client';

import { TEMPLATE_LIST } from '../templates';

interface TemplatePickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function TemplatePicker({ selectedId, onSelect }: TemplatePickerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 6, padding: '8px 4px' }}>
      {TEMPLATE_LIST.map(t => (
        <button
          key={t.id}
          title={t.description}
          onClick={() => onSelect(t.id)}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: selectedId === t.id
              ? '1px solid #333'
              : '1px solid var(--mantine-color-default-border)',
            background: selectedId === t.id ? '#f5f5f5' : 'transparent',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
            color: selectedId === t.id ? '#111' : 'var(--mantine-color-dimmed)',
            fontSize: 11,
            fontWeight: selectedId === t.id ? 600 : 400,
          }}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}
