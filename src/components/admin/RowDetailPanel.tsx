'use client';
import { NeuModal, NeuButton } from '@/components/ds';
import type { TableSchema } from '@/types/admin';
import { renderCell } from '@/lib/admin/cell-renderers';

interface RowDetailPanelProps {
  open: boolean;
  onClose: () => void;
  schema: TableSchema | null;
  row: Record<string, unknown> | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RowDetailPanel({ open, onClose, schema, row, onEdit, onDelete }: RowDetailPanelProps) {
  if (!schema || !row) return null;

  // hidden 포함 모든 컬럼 표시 (domain_data 등)
  const allColumns = schema.columns;

  return (
    <NeuModal
      open={open}
      onClose={onClose}
      title={`${schema.label} 상세`}
      maxWidth={600}
    >
      {/* 액션 버튼 */}
      {(onEdit || onDelete) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {onEdit && (
            <NeuButton variant="default" size="sm" onClick={onEdit}>
              편집
            </NeuButton>
          )}
          {onDelete && (
            <NeuButton variant="ghost" size="sm" onClick={onDelete} style={{ marginLeft: 'auto', color: 'var(--ou-text-muted)' }}>
              삭제
            </NeuButton>
          )}
        </div>
      )}

      {/* 필드 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {allColumns.map(col => {
          const value = row[col.name];
          const isEmpty = value === null || value === undefined || value === '';

          return (
            <div
              key={col.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid var(--ou-border-faint)',
                alignItems: 'flex-start',
              }}
            >
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ou-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                paddingTop: 2,
              }}>
                {col.label}
              </span>
              <div style={{ fontSize: 12, wordBreak: 'break-all' }}>
                {col.type === 'uuid' && !isEmpty ? (
                  <UuidFullDisplay value={value} />
                ) : col.type === 'json' && !isEmpty ? (
                  <JsonDisplay value={value} />
                ) : col.type === 'array' && !isEmpty ? (
                  <ArrayDisplay value={value} />
                ) : col.type === 'timestamp' && !isEmpty ? (
                  <TimestampFullDisplay value={value} />
                ) : isEmpty ? (
                  <span style={{ color: 'var(--ou-text-disabled)' }}>—</span>
                ) : (
                  renderCell(col, value)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </NeuModal>
  );
}

function UuidFullDisplay({ value }: { value: unknown }) {
  const s = String(value);
  const copy = () => navigator.clipboard.writeText(s).catch(() => {});
  return (
    <span
      onClick={copy}
      title="클릭하여 복사"
      style={{
        fontFamily: 'monospace', fontSize: 11,
        color: 'var(--ou-text-secondary)',
        cursor: 'copy',
        letterSpacing: '0.03em',
      }}
    >
      {s}
    </span>
  );
}

function JsonDisplay({ value }: { value: unknown }) {
  let formatted = '';
  try {
    formatted = JSON.stringify(value, null, 2);
  } catch {
    formatted = String(value);
  }
  return (
    <pre style={{
      margin: 0, padding: '8px 10px',
      borderRadius: 'var(--ou-radius-sm)',
      background: 'var(--ou-surface-faint)',
      boxShadow: 'var(--ou-neu-pressed-sm)',
      fontSize: 11,
      fontFamily: 'monospace',
      color: 'var(--ou-text-secondary)',
      overflowX: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      maxHeight: 200,
    }}>
      {formatted}
    </pre>
  );
}

function ArrayDisplay({ value }: { value: unknown }) {
  const arr = Array.isArray(value) ? value : [];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {arr.map((item, i) => (
        <span key={i} style={{
          padding: '2px 7px', borderRadius: 4,
          fontSize: 11,
          background: 'var(--ou-surface-faint)',
          color: 'var(--ou-text-secondary)',
          border: '1px solid var(--ou-border-faint)',
        }}>
          {String(item)}
        </span>
      ))}
    </div>
  );
}

function TimestampFullDisplay({ value }: { value: unknown }) {
  try {
    const d = new Date(value as string);
    return (
      <span style={{ fontSize: 12, color: 'var(--ou-text-body)' }}>
        {d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </span>
    );
  } catch {
    return <span style={{ fontSize: 12, color: 'var(--ou-text-body)' }}>{String(value)}</span>;
  }
}
