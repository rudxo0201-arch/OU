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

const MOOD_STYLES: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  great:   { color: 'rgba(120,220,140,0.9)', bg: 'rgba(80,200,100,0.10)', border: 'rgba(80,200,100,0.22)', emoji: '😄' },
  good:    { color: 'rgba(140,200,255,0.9)', bg: 'rgba(100,180,255,0.10)', border: 'rgba(100,180,255,0.22)', emoji: '🙂' },
  neutral: { color: 'rgba(200,200,200,0.7)', bg: 'rgba(200,200,200,0.07)', border: 'rgba(200,200,200,0.18)', emoji: '😐' },
  bad:     { color: 'rgba(255,180,100,0.9)', bg: 'rgba(255,160,60,0.10)', border: 'rgba(255,160,60,0.22)', emoji: '😔' },
  awful:   { color: 'rgba(255,110,110,0.9)', bg: 'rgba(255,80,60,0.10)',  border: 'rgba(255,80,60,0.22)',  emoji: '😢' },
};

const MOOD_LABELS: Record<string, string> = {
  great: '최고', good: '좋음', neutral: '보통', bad: '별로', awful: '힘듦',
};

export function JournalEditorView({ node }: Props) {
  const d: Record<string, unknown> = node.domain_data ?? {};
  const body: string | null = (d.body as string) ?? node.raw ?? null;
  const mood: string | null = (d.mood as string) ?? null;

  const dateStr = node.created_at
    ? new Date(node.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
      })
    : null;

  const moodStyle = mood ? MOOD_STYLES[mood] ?? null : null;

  return (
    <div style={{ padding: 24, background: 'transparent' }}>
      {/* date header */}
      {dateStr && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}>
            {dateStr}
          </div>
        </div>
      )}

      {/* mood badge */}
      {mood && moodStyle && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>기분</div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            color: moodStyle.color,
            background: moodStyle.bg,
            border: `1px solid ${moodStyle.border}`,
            borderRadius: 999,
            padding: '3px 10px',
          }}>
            <span>{moodStyle.emoji}</span>
            {MOOD_LABELS[mood] ?? mood}
          </span>
        </div>
      )}

      {/* body */}
      {body && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>내용</div>
          <div style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.82)',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {body}
          </div>
        </div>
      )}
    </div>
  );
}
