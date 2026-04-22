'use client';
import { CSSProperties, ReactNode } from 'react';
import { NeuButton } from './NeuButton';

export interface NeuTableColumn {
  key: string;
  label: string;
  width?: number | string;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface NeuTableProps {
  columns: NeuTableColumn[];
  rows: Record<string, unknown>[];
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  style?: CSSProperties;
}

export function NeuTable({
  columns,
  rows,
  page = 1,
  totalPages = 1,
  onPageChange,
  loading = false,
  emptyMessage = '데이터가 없습니다',
  style,
}: NeuTableProps) {
  return (
    <div
      style={{
        borderRadius: 'var(--ou-radius-md)',
        boxShadow: 'var(--ou-neu-pressed-md)',
        background: 'var(--ou-bg)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: columns.map((c) => c.width ?? '1fr').join(' '),
          padding: '10px 16px',
          borderBottom: '1px solid var(--ou-border-subtle)',
        }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ou-text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* 바디 */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
            로딩 중…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
            {emptyMessage}
          </div>
        ) : (
          rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: columns.map((c) => c.width ?? '1fr').join(' '),
                padding: '10px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--ou-border-faint)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ou-surface-faint)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  style={{
                    fontSize: 12,
                    color: 'var(--ou-text-body)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? '-')}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && onPageChange && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 16px',
            borderTop: '1px solid var(--ou-border-subtle)',
          }}
        >
          <NeuButton
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            style={{ padding: '5px 10px' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </NeuButton>
          <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>
            {page} / {totalPages}
          </span>
          <NeuButton
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            style={{ padding: '5px 10px' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </NeuButton>
        </div>
      )}
    </div>
  );
}
