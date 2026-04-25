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

export function DateDetailView({ node }: Props) {
  const d: Record<string, unknown> = node.domain_data ?? {};
  const rawDate: string | null = (d.date as string) ?? node.created_at ?? null;
  const mood: string | null = (d.mood as string) ?? null;
  const note: string | null = (d.note as string) ?? node.raw ?? null;

  const dateStr = rawDate
    ? (() => {
        try {
          return new Date(rawDate).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
          });
        } catch {
          return rawDate;
        }
      })()
    : null;

  return (
    <div style={{ padding: 24, background: 'transparent' }}>
      {/* date */}
      {dateStr && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>날짜</div>
          <div style={{ ...valueText, fontSize: 16, fontWeight: 600 }}>{dateStr}</div>
        </div>
      )}

      {/* mood */}
      {mood && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>기분</div>
          <div style={valueText}>{mood}</div>
        </div>
      )}

      {/* note */}
      {note && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>메모</div>
          <div style={{
            ...valueText,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '10px 14px',
            whiteSpace: 'pre-wrap',
          }}>
            {note}
          </div>
        </div>
      )}

      {/* linked items placeholder */}
      <div style={{ marginBottom: 20 }}>
        <div style={sectionLabel}>연결된 항목</div>
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.3)',
          fontStyle: 'italic',
        }}>
          {node.raw ? node.raw : '(연결된 항목 없음)'}
        </div>
      </div>
    </div>
  );
}
