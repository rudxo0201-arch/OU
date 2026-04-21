import type { ReactNode } from 'react';
import type { ColumnSchema, ColumnType } from '@/types/admin';

// ─── 포맷 헬퍼 ────────────────────────────────────────────────

function formatTimestamp(value: unknown): string {
  if (!value) return '—';
  try {
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).replace(/\. /g, '-').replace('.', '');
  } catch {
    return String(value);
  }
}

function formatUuid(value: unknown): string {
  if (!value) return '—';
  const s = String(value);
  return s.length >= 8 ? s.slice(0, 8) + '…' : s;
}

// ─── 셀 렌더러 ────────────────────────────────────────────────

function UuidCell({ value }: { value: unknown }) {
  const full = value ? String(value) : '—';
  const short = formatUuid(value);

  const copy = () => {
    if (full !== '—') navigator.clipboard.writeText(full).catch(() => {});
  };

  return (
    <span
      title={full}
      onClick={e => { e.stopPropagation(); copy(); }}
      style={{
        fontFamily: 'monospace', fontSize: 11,
        color: 'var(--ou-text-muted)',
        cursor: 'copy',
        letterSpacing: '0.02em',
      }}
    >
      {short}
    </span>
  );
}

function TimestampCell({ value }: { value: unknown }) {
  const formatted = formatTimestamp(value);
  const full = value ? new Date(value as string).toLocaleString('ko-KR') : '';
  return (
    <span
      title={full}
      style={{ fontSize: 12, color: 'var(--ou-text-secondary)', whiteSpace: 'nowrap' }}
    >
      {formatted}
    </span>
  );
}

function BooleanCell({ value }: { value: unknown }) {
  const isTrue = value === true || value === 'true';
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: isTrue ? 'var(--ou-text-secondary)' : 'transparent',
      border: '1.5px solid var(--ou-text-muted)',
    }} />
  );
}

function EnumCell({ value }: { value: unknown }) {
  if (!value) return <span style={{ color: 'var(--ou-text-disabled)' }}>—</span>;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 500,
      background: 'var(--ou-surface-faint)',
      color: 'var(--ou-text-secondary)',
      border: '1px solid var(--ou-border-faint)',
      letterSpacing: '0.01em',
    }}>
      {String(value)}
    </span>
  );
}

function JsonCell({ value, onClick }: { value: unknown; onClick?: () => void }) {
  if (!value) return <span style={{ color: 'var(--ou-text-disabled)' }}>—</span>;
  return (
    <span
      onClick={e => { e.stopPropagation(); onClick?.(); }}
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 4,
        fontSize: 11,
        fontFamily: 'monospace',
        background: 'var(--ou-surface-faint)',
        color: 'var(--ou-text-muted)',
        border: '1px solid var(--ou-border-faint)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {'{…}'}
    </span>
  );
}

function ArrayCell({ value }: { value: unknown }) {
  const arr = Array.isArray(value) ? value : [];
  if (arr.length === 0) return <span style={{ color: 'var(--ou-text-disabled)' }}>—</span>;
  return (
    <span
      title={arr.join(', ')}
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 4,
        fontSize: 11,
        background: 'var(--ou-surface-faint)',
        color: 'var(--ou-text-muted)',
        border: '1px solid var(--ou-border-faint)',
      }}
    >
      [{arr.length}]
    </span>
  );
}

function NumberCell({ value, float }: { value: unknown; float?: boolean }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--ou-text-disabled)' }}>—</span>;
  const n = Number(value);
  const formatted = isNaN(n) ? String(value) : float
    ? n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString('ko-KR');
  return (
    <span style={{ fontSize: 12, color: 'var(--ou-text-body)', fontVariantNumeric: 'tabular-nums' }}>
      {formatted}
    </span>
  );
}

function TextCell({ value }: { value: unknown }) {
  if (!value) return <span style={{ color: 'var(--ou-text-disabled)' }}>—</span>;
  const s = String(value);
  return (
    <span
      title={s.length > 60 ? s : undefined}
      style={{
        fontSize: 12,
        color: 'var(--ou-text-body)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'block',
        maxWidth: 200,
      }}
    >
      {s}
    </span>
  );
}

// ─── 공개 API ────────────────────────────────────────────────

export function renderCell(
  column: ColumnSchema,
  value: unknown,
  onExpandJson?: () => void,
): ReactNode {
  switch (column.type as ColumnType) {
    case 'uuid':    return <UuidCell value={value} />;
    case 'timestamp': return <TimestampCell value={value} />;
    case 'boolean': return <BooleanCell value={value} />;
    case 'enum':    return <EnumCell value={value} />;
    case 'json':    return <JsonCell value={value} onClick={onExpandJson} />;
    case 'array':   return <ArrayCell value={value} />;
    case 'integer': return <NumberCell value={value} />;
    case 'float':   return <NumberCell value={value} float />;
    case 'text':
    default:        return <TextCell value={value} />;
  }
}

/** 컬럼 타입별 권장 너비 */
export function getColumnWidth(type: ColumnType): string {
  switch (type) {
    case 'uuid':      return '90px';
    case 'timestamp': return '130px';
    case 'boolean':   return '60px';
    case 'enum':      return '110px';
    case 'json':      return '70px';
    case 'array':     return '70px';
    case 'integer':
    case 'float':     return '80px';
    case 'text':
    default:          return '1fr';
  }
}
