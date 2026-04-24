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

export function DiaperWidget() {
  const { events, loading } = useCareEvents('diaper');

  const today = events.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());
  const poopCount = today.filter(e => ['poop', 'both'].includes(e.domain_data?.event_data?.kind ?? '')).length;
  const peeCount = today.filter(e => ['pee', 'both'].includes(e.domain_data?.event_data?.kind ?? '')).length;
  const latest = events[0] ?? null;

  return (
    <div style={card}>
      <div style={titleStyle}>기저귀</div>
      {loading ? (
        <div style={{ color: 'var(--ou-text-muted)', fontSize: 13 }}>로딩 중...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ou-text-heading)', lineHeight: 1 }}>{today.length}</div>
              <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 2 }}>오늘 교체</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ou-text-strong)' }}>{peeCount}</div>
                <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>소변</div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ou-text-strong)' }}>{poopCount}</div>
                <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>대변</div>
              </div>
            </div>
          </div>
          {latest && (
            <div style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>
              마지막: {timeSince(latest.created_at)}
              {latest.domain_data?.subject_name ? ` (${latest.domain_data.subject_name})` : ''}
            </div>
          )}
          {events.length === 0 && <div style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>기록이 없어요</div>}
        </>
      )}
    </div>
  );
}
