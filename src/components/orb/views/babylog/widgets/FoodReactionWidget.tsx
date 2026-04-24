'use client';

import { CSSProperties } from 'react';
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

function reactionColor(reaction: string) {
  const lower = reaction.toLowerCase();
  if (['두드러기', '구토', '설사', '알레르기', '발진'].some(w => lower.includes(w))) return '#c0392b';
  if (['괜찮', '이상없', '잘 먹'].some(w => lower.includes(w))) return 'rgba(0,0,0,0.5)';
  return 'var(--ou-text-body)';
}

export function FoodReactionWidget() {
  const { events, loading } = useCareEvents('food_reaction');

  return (
    <div style={card}>
      <div style={titleStyle}>음식 반응</div>
      {loading ? (
        <div style={{ color: 'var(--ou-text-muted)', fontSize: 13 }}>로딩 중...</div>
      ) : events.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {events.slice(0, 10).map(e => {
            const ed = e.domain_data?.event_data ?? {};
            const reaction = ed.reaction ?? '';
            return (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--ou-text-heading)' }}>{ed.food ?? '?'}</span>
                  {e.domain_data?.subject_name && (
                    <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginLeft: 6 }}>{e.domain_data.subject_name}</span>
                  )}
                </div>
                <span style={{ color: reactionColor(reaction), fontSize: 12, fontWeight: 500 }}>{reaction || '-'}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>기록이 없어요</div>
      )}
    </div>
  );
}
