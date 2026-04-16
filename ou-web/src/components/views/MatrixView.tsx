'use client';

import { useMemo } from 'react';
import type { ViewProps } from './registry';

interface MatrixItem {
  id: string;
  title: string;
  quadrant: number;
}

const QUADRANT_LABELS = [
  { label: 'Important & Urgent', row: 0, col: 0 },
  { label: 'Important & Not Urgent', row: 0, col: 1 },
  { label: 'Not Important & Urgent', row: 1, col: 0 },
  { label: 'Not Important & Not Urgent', row: 1, col: 1 },
];

function getQuadrant(node: any): number {
  const d = node.domain_data ?? {};
  const importance = Number(d.importance ?? (d.priority === 'high' || d.priority === 'urgent' ? 1 : 0));
  const urgency = Number(d.urgency ?? (d.priority === 'urgent' ? 1 : 0));

  if (importance >= 0.5 && urgency >= 0.5) return 0;
  if (importance >= 0.5 && urgency < 0.5) return 1;
  if (importance < 0.5 && urgency >= 0.5) return 2;
  return 3;
}

export function MatrixView({ nodes }: ViewProps) {
  const quadrants = useMemo(() => {
    const buckets: MatrixItem[][] = [[], [], [], []];
    for (const n of nodes) {
      const q = getQuadrant(n);
      buckets[q].push({
        id: n.id,
        title: n.domain_data?.title ?? ((n.raw ?? '').slice(0, 30) || 'Item'),
        quadrant: q,
      });
    }
    return buckets;
  }, [nodes]);

  if (nodes.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 16 }}>
      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', marginBottom: 16 }}>Matrix</span>

      <div style={{ position: 'relative' }}>
        <p style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', textAlign: 'center', marginBottom: 4, marginTop: 0 }}>
          ← Urgent &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Not Urgent →
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {QUADRANT_LABELS.map((q, i) => (
            <div
              key={i}
              style={{
                border: '0.5px solid var(--ou-border, #333)',
                borderRadius: 4,
                padding: 12,
                minHeight: 140,
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', fontWeight: 500, display: 'block', marginBottom: 8 }}>
                {q.label}
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {quadrants[i].map(item => (
                  <div
                    key={item.id}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '0.5px solid var(--ou-border, #333)',
                    }}
                  >
                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {item.title}
                    </span>
                  </div>
                ))}
                {quadrants[i].length === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', fontStyle: 'italic' }}>
                    No items
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', textAlign: 'center', marginTop: 4, marginBottom: 0 }}>
          ↑ Important &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Not Important ↓
        </p>
      </div>
    </div>
  );
}
