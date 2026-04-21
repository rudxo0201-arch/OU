'use client';
import { CSSProperties, ReactNode } from 'react';

export interface AdminTableColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface AdminTableProps {
  columns: AdminTableColumn[];
  rows: Record<string, unknown>[];
  sortKey?: string;
  sortAsc?: boolean;
  onSort?: (key: string) => void;
  onRowClick?: (row: Record<string, unknown>) => void;
  loading?: boolean;
  emptyMessage?: string;
  style?: CSSProperties;
  selectedIds?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
}

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="none"
      style={{ opacity: active ? 0.8 : 0.25, flexShrink: 0 }}
    >
      {asc || !active
        ? <path d="M5 2L8 7H2L5 2Z" fill="currentColor" />
        : <path d="M5 8L2 3H8L5 8Z" fill="currentColor" />}
    </svg>
  );
}

export function AdminTable({
  columns,
  rows,
  sortKey,
  sortAsc = false,
  onSort,
  onRowClick,
  loading = false,
  emptyMessage = '데이터가 없습니다',
  style,
  selectedIds,
  onSelectRow,
  onSelectAll,
}: AdminTableProps) {
  const hasSelection = !!onSelectRow;
  const allSelected = hasSelection && rows.length > 0 && rows.every(r => selectedIds?.has(String(r.id)));
  const someSelected = hasSelection && !allSelected && rows.some(r => selectedIds?.has(String(r.id)));

  const gridCols = [
    ...(hasSelection ? ['40px'] : []),
    ...columns.map(c => c.width ?? '1fr'),
  ].join(' ');

  return (
    <div style={{
      borderRadius: 'var(--ou-radius-md)',
      boxShadow: 'var(--ou-neu-pressed-sm)',
      background: 'var(--ou-bg)',
      overflow: 'hidden',
      ...style,
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        padding: '8px 14px',
        borderBottom: '1px solid var(--ou-border-subtle)',
        background: 'var(--ou-surface-faint)',
      }}>
        {hasSelection && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={() => onSelectAll?.()}
            />
          </div>
        )}
        {columns.map(col => (
          <div
            key={col.key}
            onClick={() => col.sortable && onSort?.(col.key)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: sortKey === col.key ? 'var(--ou-text-body)' : 'var(--ou-text-muted)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: col.sortable ? 'pointer' : 'default',
              userSelect: 'none',
            }}
          >
            {col.label}
            {col.sortable && (
              <SortIcon active={sortKey === col.key} asc={sortKey === col.key ? sortAsc : true} />
            )}
          </div>
        ))}
      </div>

      {/* 바디 */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 12 }}>
            로딩 중…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 12 }}>
            {emptyMessage}
          </div>
        ) : (
          rows.map((row, i) => {
            const id = String(row.id ?? i);
            const isSelected = selectedIds?.has(id);
            return (
              <div
                key={id}
                onClick={() => onRowClick?.(row)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  padding: '9px 14px',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--ou-border-faint)' : 'none',
                  cursor: onRowClick ? 'pointer' : 'default',
                  background: isSelected ? 'var(--ou-surface-faint)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--ou-surface-faint)'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {hasSelection && (
                  <div
                    style={{ display: 'flex', alignItems: 'center' }}
                    onClick={e => { e.stopPropagation(); onSelectRow?.(id); }}
                  >
                    <Checkbox checked={!!isSelected} onChange={() => onSelectRow?.(id)} />
                  </div>
                )}
                {columns.map(col => (
                  <div
                    key={col.key}
                    style={{ overflow: 'hidden', display: 'flex', alignItems: 'center' }}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : <span style={{ fontSize: 12, color: 'var(--ou-text-body)' }}>{String(row[col.key] ?? '—')}</span>
                    }
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// 간단한 내부용 체크박스
function Checkbox({ checked, indeterminate, onChange }: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange(); }}
      style={{
        width: 14, height: 14,
        border: '1.5px solid var(--ou-border-subtle)',
        borderRadius: 3,
        background: checked || indeterminate ? 'var(--ou-text-muted)' : 'var(--ou-bg)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {(checked || indeterminate) && (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          {indeterminate && !checked
            ? <path d="M2 4h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            : <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      )}
    </div>
  );
}
