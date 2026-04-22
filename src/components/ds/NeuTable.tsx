'use client';

import React from 'react';

export interface NeuTableColumn {
  key: string;
  label: string;
  width?: number | string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface NeuTableProps {
  columns: NeuTableColumn[];
  rows: Record<string, unknown>[];
  style?: React.CSSProperties;
}

export function NeuTable({ columns, rows, style }: NeuTableProps) {
  return (
    <div style={{ overflowX: 'auto', ...style }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: 12, color: 'var(--ou-text-body)',
      }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--ou-border-subtle)' }}>
            {columns.map(col => (
              <th key={col.key} style={{
                textAlign: 'left', padding: '6px 10px',
                fontWeight: 600, fontSize: 11, color: 'var(--ou-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                width: col.width,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--ou-border-faint)' }}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '6px 10px', verticalAlign: 'top' }}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--ou-text-muted)' }}>
                데이터 없음
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
