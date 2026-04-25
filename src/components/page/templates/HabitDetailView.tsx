'use client';

import type { FullNode } from '../PageRenderer';

interface Props {
  node: FullNode;
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  marginBottom: 8,
  fontWeight: 600,
};

const valueText: React.CSSProperties = {
  fontSize: 14,
  color: 'rgba(255,255,255,0.85)',
  lineHeight: 1.6,
};

export function HabitDetailView({ node }: Props) {
  const d: Record<string, unknown> = node.domain_data ?? {};
  const title: string | null = (d.title as string) ?? node.raw ?? null;
  const recurrence: string | null = (d.recurrence as string) ?? null;
  const streak: number | null = typeof d.streak === 'number' ? d.streak : null;
  const lastDone: string | null = (d.last_done as string) ?? null;

  return (
    <div style={{ padding: 24, background: 'transparent' }}>
      {/* title */}
      {title && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>습관</div>
          <div style={{ ...valueText, fontSize: 16, fontWeight: 600 }}>{title}</div>
        </div>
      )}

      {/* streak badge */}
      {streak !== null && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>연속 달성</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(255,180,60,0.12)',
              border: '1px solid rgba(255,180,60,0.28)',
            }}>
              <span style={{ fontSize: 18 }}>🔥</span>
              <span style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'rgba(255,200,80,0.95)',
                letterSpacing: '-0.02em',
              }}>
                {streak}
              </span>
              <span style={{
                fontSize: 12,
                color: 'rgba(255,200,80,0.65)',
                marginLeft: 2,
              }}>
                일 연속
              </span>
            </div>
          </div>
        </div>
      )}

      {/* recurrence */}
      {recurrence && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>반복 주기</div>
          <div style={valueText}>{recurrence}</div>
        </div>
      )}

      {/* last done */}
      {lastDone && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>마지막 달성일</div>
          <div style={valueText}>{lastDone}</div>
        </div>
      )}
    </div>
  );
}
