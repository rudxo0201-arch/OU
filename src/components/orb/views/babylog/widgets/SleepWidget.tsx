'use client';

import { CSSProperties, useEffect, useState } from 'react';
import { useCareEvents } from '../useCareEvents';

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

function formatDuration(startIso: string, endIso?: string) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const mins = Math.floor((end - start) / 60000);
  if (mins < 60) return `${mins}분`;
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}

export function SleepWidget() {
  const { events, loading } = useCareEvents('sleep');
  const [, tick] = useState(0);

  // sleeping 상태 갱신을 위한 ticker
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const sleeping = events.find(e => !e.domain_data?.ended_at);
  const lastComplete = events.find(e => e.domain_data?.ended_at);

  const todayMins = events
    .filter(e => e.domain_data?.ended_at && new Date(e.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, e) => {
      const mins = Math.floor((new Date(e.domain_data.ended_at).getTime() - new Date(e.created_at).getTime()) / 60000);
      return sum + Math.max(0, mins);
    }, 0);

  return (
    <div style={card}>
      <div style={titleStyle}>수면</div>
      {loading ? (
        <div style={{ color: 'var(--ou-text-muted)', fontSize: 13 }}>로딩 중...</div>
      ) : (
        <>
          {sleeping ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'inline-block' }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ou-text-heading)' }}>
                  자는 중 {sleeping.domain_data?.subject_name ? `(${sleeping.domain_data.subject_name})` : ''}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ou-text-muted)', marginTop: 4 }}>
                {formatDuration(sleeping.created_at)} 경과
              </div>
            </div>
          ) : lastComplete ? (
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--ou-text-body)' }}>
              마지막 수면: {formatDuration(lastComplete.created_at, lastComplete.domain_data.ended_at)}
            </div>
          ) : null}
          <div style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>
            오늘 총: {todayMins < 60 ? `${todayMins}분` : `${Math.floor(todayMins / 60)}시간 ${todayMins % 60}분`}
          </div>
          {events.length === 0 && <div style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>기록이 없어요</div>}
        </>
      )}
    </div>
  );
}
