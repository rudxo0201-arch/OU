'use client';
import type { FilterRule } from '@/types/view-editor';

interface Props {
  rule: FilterRule;
  fields: { key: string; label: string }[];
  onChange: (partial: Partial<FilterRule>) => void;
  onRemove: () => void;
}

const OPS: { key: FilterRule['op']; label: string }[] = [
  { key: '=',        label: '=' },
  { key: '!=',       label: '≠' },
  { key: '>',        label: '>' },
  { key: '<',        label: '<' },
  { key: 'contains', label: '포함' },
  { key: 'has',      label: '있음' },
];

const selectStyle: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 8, border: 'none', outline: 'none',
  background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
  fontSize: 13, color: 'var(--ou-text-strong)', fontFamily: 'inherit',
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', outline: 'none',
  background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
  fontSize: 13, color: 'var(--ou-text-strong)', fontFamily: 'inherit',
};

export function FilterRuleRow({ rule, fields, onChange, onRemove }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <select value={rule.field} onChange={e => onChange({ field: e.target.value })} style={selectStyle}>
        <option value="">필드</option>
        {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>

      <select value={rule.op} onChange={e => onChange({ op: e.target.value as FilterRule['op'] })} style={{ ...selectStyle, width: 60 }}>
        {OPS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>

      <input
        type="text"
        value={String(rule.value)}
        onChange={e => onChange({ value: e.target.value })}
        placeholder="값"
        style={inputStyle}
      />

      <button
        onClick={onRemove}
        style={{
          width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--ou-text-disabled)', fontSize: 16, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
