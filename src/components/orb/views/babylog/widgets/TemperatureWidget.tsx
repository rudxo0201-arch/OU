'use client';

import { CSSProperties } from 'react';
import { useCareEvents } from '../useCareEvents';

function timeSince(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return '방금 전';
  if (diff < 60) return `${diff}분 전`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}시간 ${diff % 60}분 전`;
  return `${Math.floor(h / 24)}일 전`;
}

const card: CSSProperties = {
  background: 'rgba(255,255,255,0.88)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 14,
  padding: '16px 18px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const titleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ou-text-muted)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  marginBottom: 10,
};

export function TemperatureWidget() {
  const { events, loading } = useCareEvents('temperature');
  const latest = events[0] ?? null;
  const temp = latest ? Number(latest.domain_data?.event_data?.temperature_c) : null;
  const isFever = temp !== null && temp >= 37.5;

  return (
    <div style={card}>
      <div style={titleStyle}>체온</div>
      {loading ? (
        <div style={{ color: 'var(--ou-text-muted)', fontSize: 13 }}>로딩 중...</div>
      ) : latest ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: isFever ? '#c0392b' : 'var(--ou-text-heading)', lineHeight: 1 }}>
              {temp?.toFixed(1) ?? '?'}
            </span>
            <span style={{ fontSize: 18, color: 'var(--ou-text-muted)' }}>℃</span>
            {isFever && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#c0392b', marginLeft: 4 }}>발열</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>
            {timeSince(latest.created_at)}
            {latest.domain_data?.subject_name ? ` · ${latest.domain_data.subject_name}` : ''}
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {events.slice(1, 5).map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ou-text-secondary)' }}>
                <span>{Number(e.domain_data?.event_data?.temperature_c).toFixed(1)}℃{e.domain_data?.subject_name ? ` (${e.domain_data.subject_name})` : ''}</span>
                <span style={{ color: 'var(--ou-text-muted)' }}>{timeSince(e.created_at)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>기록이 없어요</div>
      )}
    </div>
  );
}
