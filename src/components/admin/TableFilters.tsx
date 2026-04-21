'use client';
import { NeuSelect, NeuInput } from '@/components/ds';
import type { TableSchema } from '@/types/admin';

export interface FilterValues {
  [columnName: string]: string;
}

interface TableFiltersProps {
  schema: TableSchema;
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
}

const THREE_STATE = ['전체', 'true', 'false'];

export function TableFilters({ schema, filters, onChange }: TableFiltersProps) {
  // 필터로 노출할 컬럼: enum, boolean, timestamp
  const filterableCols = schema.columns.filter(c =>
    !c.hidden && (c.type === 'enum' || c.type === 'boolean' || c.type === 'timestamp')
  );

  if (filterableCols.length === 0) return null;

  const set = (name: string, value: string) => {
    onChange({ ...filters, [name]: value });
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 32px 8px' }}>
      {filterableCols.map(col => {
        if (col.type === 'enum' && col.options) {
          return (
            <NeuSelect
              key={col.name}
              value={filters[col.name] ?? ''}
              onChange={v => set(col.name, v)}
              options={[
                { value: '', label: `${col.label} 전체` },
                ...col.options.map(o => ({ value: o, label: o })),
              ]}
              style={{ minWidth: 140 }}
            />
          );
        }
        if (col.type === 'boolean') {
          return (
            <NeuSelect
              key={col.name}
              value={filters[col.name] ?? ''}
              onChange={v => set(col.name, v)}
              options={[
                { value: '', label: `${col.label} 전체` },
                { value: 'true', label: `${col.label}: 예` },
                { value: 'false', label: `${col.label}: 아니오` },
              ]}
              style={{ minWidth: 140 }}
            />
          );
        }
        if (col.type === 'timestamp') {
          return (
            <div key={col.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', whiteSpace: 'nowrap' }}>{col.label}</span>
              <NeuInput
                type="date"
                value={filters[`${col.name}_from`] ?? ''}
                onChange={e => set(`${col.name}_from`, e.target.value)}
                style={{ width: 130 }}
              />
              <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>~</span>
              <NeuInput
                type="date"
                value={filters[`${col.name}_to`] ?? ''}
                onChange={e => set(`${col.name}_to`, e.target.value)}
                style={{ width: 130 }}
              />
            </div>
          );
        }
        return null;
      })}
      {Object.values(filters).some(v => v !== '') && (
        <button
          onClick={() => onChange({})}
          style={{
            padding: '0 10px', fontSize: 11,
            color: 'var(--ou-text-muted)',
            background: 'transparent', border: 'none',
            cursor: 'pointer',
          }}
        >
          필터 초기화
        </button>
      )}
    </div>
  );
}

/** filter.* 쿼리 파라미터 빌드 */
export function buildFilterParams(filters: FilterValues): Record<string, string> {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '') params[`filter.${key}`] = value;
  });
  return params;
}
