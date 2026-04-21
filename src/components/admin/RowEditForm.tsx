'use client';
import { useState } from 'react';
import { NeuButton, NeuInput, NeuTextarea, NeuSelect, NeuToggle } from '@/components/ds';
import type { TableSchema, ColumnSchema } from '@/types/admin';

interface RowEditFormProps {
  schema: TableSchema;
  row: Record<string, unknown>;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function RowEditForm({ schema, row, onSave, onCancel }: RowEditFormProps) {
  const editableCols = schema.columns.filter(c => c.editable);

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    editableCols.forEach(c => { init[c.name] = row[c.name] ?? ''; });
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (name: string, value: unknown) => {
    setValues(v => ({ ...v, [name]: value }));
    setErrors(e => { const next = { ...e }; delete next[name]; return next; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    editableCols.forEach(col => {
      if (col.required) {
        const v = values[col.name];
        if (v === null || v === undefined || v === '') {
          errs[col.name] = '필수 항목입니다';
        }
      }
      if (col.type === 'json' && values[col.name]) {
        try { JSON.parse(String(values[col.name])); } catch {
          errs[col.name] = '유효한 JSON이 아닙니다';
        }
      }
    });
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    // diff: 원본과 다른 값만
    const updates: Record<string, unknown> = {};
    editableCols.forEach(col => {
      const original = row[col.name] ?? '';
      const current = values[col.name] ?? '';
      if (String(original) !== String(current)) {
        updates[col.name] = col.type === 'json' && current
          ? JSON.parse(String(current))
          : col.type === 'integer' ? Number(current)
          : col.type === 'float' ? parseFloat(String(current))
          : col.type === 'boolean' ? Boolean(current)
          : current;
      }
    });

    if (Object.keys(updates).length === 0) { onCancel(); return; }

    setSaving(true);
    try { await onSave(updates); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {editableCols.map(col => (
        <FieldControl
          key={col.name}
          col={col}
          value={values[col.name]}
          error={errors[col.name]}
          onChange={v => set(col.name, v)}
        />
      ))}
      <div style={{ display: 'flex', gap: 8, paddingTop: 8, justifyContent: 'flex-end' }}>
        <NeuButton variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          취소
        </NeuButton>
        <NeuButton variant="default" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </NeuButton>
      </div>
    </div>
  );
}

function FieldControl({
  col, value, error, onChange,
}: {
  col: ColumnSchema;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  const isLongText = col.type === 'text' && ['raw', 'content', 'bio', 'description', 'text'].includes(col.name);

  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 11, fontWeight: 600,
        color: 'var(--ou-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 6,
      }}>
        {col.label}
        {col.required && <span style={{ color: 'var(--ou-text-muted)', marginLeft: 2 }}>*</span>}
      </label>

      {col.type === 'boolean' ? (
        <NeuToggle
          checked={Boolean(value)}
          onChange={checked => onChange(checked)}
        />
      ) : col.type === 'enum' && col.options ? (
        <NeuSelect
          value={String(value ?? '')}
          onChange={v => onChange(v)}
          options={[
            { value: '', label: '선택…' },
            ...col.options.map(o => ({ value: o, label: o })),
          ]}
        />
      ) : col.type === 'json' ? (
        <NeuTextarea
          value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          rows={4}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      ) : isLongText ? (
        <NeuTextarea
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <NeuInput
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          type={col.type === 'integer' || col.type === 'float' ? 'number' : 'text'}
        />
      )}

      {error && (
        <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 4, display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  );
}
