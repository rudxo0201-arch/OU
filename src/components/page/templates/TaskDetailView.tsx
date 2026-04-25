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

const PRIORITY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  high:   { color: 'rgba(255,120,100,0.9)', bg: 'rgba(255,80,60,0.12)',  border: 'rgba(255,80,60,0.25)' },
  medium: { color: 'rgba(255,190,80,0.9)',  bg: 'rgba(255,180,60,0.12)', border: 'rgba(255,180,60,0.25)' },
  low:    { color: 'rgba(120,200,140,0.9)', bg: 'rgba(80,200,100,0.10)', border: 'rgba(80,200,100,0.22)' },
};

const PRIORITY_LABELS: Record<string, string> = {
  high: '높음', medium: '보통', low: '낮음',
};

export function TaskDetailView({ node }: Props) {
  const d: Record<string, unknown> = node.domain_data ?? {};
  const title: string | null = (d.title as string) ?? node.raw ?? null;
  const due: string | null = (d.due as string) ?? null;
  const priority: string | null = (d.priority as string) ?? null;
  const done: boolean = d.done === true;
  const subtasks: string[] | null = Array.isArray(d.subtasks) && d.subtasks.length > 0 ? d.subtasks as string[] : null;

  const priorityStyle = priority ? PRIORITY_STYLES[priority] ?? null : null;

  return (
    <div style={{ padding: 24, background: 'transparent' }}>
      {/* title + done */}
      {title && (
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* checkbox (display-only) */}
          <div style={{
            width: 18,
            height: 18,
            marginTop: 2,
            borderRadius: 4,
            border: done ? '1.5px solid rgba(120,200,140,0.7)' : '1.5px solid rgba(255,255,255,0.22)',
            background: done ? 'rgba(80,200,100,0.15)' : 'transparent',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {done && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.8 7L9 1" stroke="rgba(120,200,140,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <div style={{
            ...valueText,
            fontSize: 16,
            fontWeight: 600,
            textDecoration: done ? 'line-through' : 'none',
            color: done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)',
          }}>
            {title}
          </div>
        </div>
      )}

      {/* priority */}
      {priority && priorityStyle && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>우선순위</div>
          <span style={{
            display: 'inline-flex',
            fontSize: 12,
            fontWeight: 600,
            color: priorityStyle.color,
            background: priorityStyle.bg,
            border: `1px solid ${priorityStyle.border}`,
            borderRadius: 999,
            padding: '3px 10px',
          }}>
            {PRIORITY_LABELS[priority] ?? priority}
          </span>
        </div>
      )}

      {/* due date */}
      {due && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>마감일</div>
          <div style={valueText}>{due}</div>
        </div>
      )}

      {/* subtasks */}
      {subtasks && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>하위 할일</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subtasks.map((st, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
              }}>
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  border: '1.5px solid rgba(255,255,255,0.18)',
                  flexShrink: 0,
                }} />
                {st}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
