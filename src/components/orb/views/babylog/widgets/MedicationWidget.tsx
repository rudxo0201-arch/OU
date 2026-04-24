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

export function MedicationWidget() {
  const { events, loading } = useCareEvents('medication');
  const today = events.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());

  return (
    <div style={card}>
      <div style={titleStyle}>투약</div>
      {loading ? (
        <div style={{ color: 'var(--ou-text-muted)', fontSize: 13 }}>로딩 중...</div>
      ) : today.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {today.map(e => {
            const dd = e.domain_data ?? {};
            const ed = dd.event_data ?? {};
            return (
              <div key={e.id} style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ou-text-heading)' }}>
                    {ed.drug ?? '약'} {ed.dose ? `· ${ed.dose}` : ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{timeSince(e.created_at)}</span>
                </div>
                {(ed.reason || dd.subject_name) && (
                  <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginTop: 2 }}>
                    {[dd.subject_name, ed.reason].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>오늘 투약 기록 없어요</div>
      )}
    </div>
  );
}
