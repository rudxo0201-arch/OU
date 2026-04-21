'use client';
import { useState } from 'react';
import { NeuModal, NeuButton, NeuInput, NeuTextarea, NeuSelect, NeuToggle } from '@/components/ds';
import type { TableSchema, ColumnSchema } from '@/types/admin';

interface RowCreateFormProps {
  open: boolean;
  onClose: () => void;
  schema: TableSchema;
  onCreate: (data: Record<string, unknown>) => Promise<void>;
}

// 자동 생성 컬럼은 폼에서 제외
const AUTO_COLS = new Set(['id', 'created_at', 'updated_at', 'joined_at']);

export function RowCreateForm({ open, onClose, schema, onCreate }: RowCreateFormProps) {
  const creatableCols = schema.columns.filter(
    c => !AUTO_COLS.has(c.name) && (c.editable || c.required)
  );

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    creatableCols.forEach(c => {
      init[c.name] = c.type === 'boolean' ? false : '';
    });
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (name: string, value: unknown) => {
    setValues(v => ({ ...v, [name]: value }));
    setErrors(e => { const next = { ...e }; delete next[name]; return next; });
  };

  const handleCreate = async () => {
    const errs: Record<string, string> = {};
    creatableCols.forEach(col => {
      if (col.required) {
        const v = values[col.name];
        if (v === null || v === undefined || v === '') errs[col.name] = '필수 항목입니다';
      }
      if (col.type === 'json' && values[col.name]) {
        try { JSON.parse(String(values[col.name])); } catch {
          errs[col.name] = '유효한 JSON이 아닙니다';
        }
      }
    });
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const data: Record<string, unknown> = {};
    creatableCols.forEach(col => {
      const v = values[col.name];
      if (v === '' || v === null || v === undefined) return;
      data[col.name] = col.type === 'json' ? JSON.parse(String(v))
        : col.type === 'integer' ? Number(v)
        : col.type === 'float' ? parseFloat(String(v))
        : v;
    });

    setSaving(true);
    try {
      await onCreate(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <NeuModal open={open} onClose={onClose} title={`${schema.label} 추가`} maxWidth={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {creatableCols.map(col => (
          <CreateField
            key={col.name}
            col={col}
            value={values[col.name]}
            error={errors[col.name]}
            onChange={v => set(col.name, v)}
          />
        ))}
        <div style={{ display: 'flex', gap: 8, paddingTop: 8, justifyContent: 'flex-end' }}>
          <NeuButton variant="ghost" size="sm" onClick={onClose} disabled={saving}>취소</NeuButton>
          <NeuButton variant="default" size="sm" onClick={handleCreate} disabled={saving}>
            {saving ? '생성 중…' : '생성'}
          </NeuButton>
        </div>
      </div>
    </NeuModal>
  );
}

function CreateField({ col, value, error, onChange }: {
  col: ColumnSchema;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  const isLong = col.type === 'text' && ['raw', 'content', 'bio', 'description', 'text'].includes(col.name);
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: 'var(--ou-text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.05em', marginBottom: 5,
      }}>
        {col.label}{col.required && ' *'}
      </label>
      {col.type === 'boolean' ? (
        <NeuToggle checked={Boolean(value)} onChange={onChange} />
      ) : col.type === 'enum' && col.options ? (
        <NeuSelect
          value={String(value ?? '')}
          onChange={onChange}
          options={[{ value: '', label: '선택…' }, ...col.options.map(o => ({ value: o, label: o }))]}
        />
      ) : col.type === 'json' ? (
        <NeuTextarea
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          rows={3} style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      ) : isLong ? (
        <NeuTextarea value={String(value ?? '')} onChange={e => onChange(e.target.value)} rows={2} />
      ) : (
        <NeuInput
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          type={col.type === 'integer' || col.type === 'float' ? 'number' : 'text'}
        />
      )}
      {error && <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 3, display: 'block' }}>{error}</span>}
    </div>
  );
}
