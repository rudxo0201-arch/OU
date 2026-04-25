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

export function ScheduleDetailView({ node }: Props) {
  const d: Record<string, unknown> = node.domain_data ?? {};
  const title: string | null = (d.title as string) ?? node.raw ?? null;
  const date: string | null = (d.date as string) ?? null;
  const startTime: string | null = (d.start_time as string) ?? null;
  const endTime: string | null = (d.end_time as string) ?? null;
  const location: string | null = (d.location as string) ?? null;
  const memo: string | null = (d.memo as string) ?? null;
  const persons: string[] | null = Array.isArray(d.persons) && d.persons.length > 0 ? d.persons as string[] : null;

  return (
    <div style={{ padding: 24, background: 'transparent' }}>
      {/* title */}
      {title && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>제목</div>
          <div style={{ ...valueText, fontSize: 16, fontWeight: 600 }}>{title}</div>
        </div>
      )}

      {/* date / time */}
      {(date || startTime || endTime) && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>일시</div>
          <div style={valueText}>
            {date && <span>{date}</span>}
            {(startTime || endTime) && (
              <span style={{ marginLeft: date ? 8 : 0, color: 'rgba(255,255,255,0.65)' }}>
                {startTime ?? ''}
                {startTime && endTime && ' – '}
                {endTime ?? ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* location */}
      {location && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>장소</div>
          <div style={valueText}>{location}</div>
        </div>
      )}

      {/* participants */}
      {persons && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>참여자</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {persons.map((p, i) => (
              <span key={i} style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999,
                padding: '2px 10px',
              }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* memo */}
      {memo && (
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
            {memo}
          </div>
        </div>
      )}
    </div>
  );
}
