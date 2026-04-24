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

export function FeedingWidget() {
  const { events, loading } = useCareEvents('feeding');

  const todayTotal = events
    .filter(e => new Date(e.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, e) => sum + (Number(e.domain_data?.event_data?.amount_ml) || 0), 0);

  const latest = events[0] ?? null;

  return (
    <div style={card}>
      <div style={titleStyle}>수유</div>
      {loading ? (
        <div style={{ color: 'var(--ou-text-muted)', fontSize: 13 }}>로딩 중...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ou-text-heading)', lineHeight: 1 }}>{todayTotal}</div>
              <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 2 }}>오늘 총 ml</div>
            </div>
            {latest && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ou-text-strong)' }}>
                  {latest.domain_data?.event_data?.amount_ml ?? '?'}ml
                </div>
                <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 2 }}>
                  {timeSince(latest.created_at)}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
            {events.slice(0, 6).map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ou-text-body)' }}>
                <span>{e.domain_data?.subject_name ?? ''} {e.domain_data?.event_data?.amount_ml ?? '?'}ml ({e.domain_data?.event_data?.method ?? '-'})</span>
                <span style={{ color: 'var(--ou-text-muted)', fontSize: 11 }}>{timeSince(e.created_at)}</span>
              </div>
            ))}
            {events.length === 0 && <div style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>기록이 없어요</div>}
          </div>
        </>
      )}
    </div>
  );
}
