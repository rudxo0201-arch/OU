'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE, formatDateShort, formatTime } from './base';

export function ScheduleAroundView({ nodes }: ViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - 3);
  const end = new Date(today);
  end.setDate(today.getDate() + 3);

  const filtered = nodes
    .filter(n => {
      const date = n.domain_data?.date || n.domain_data?.when;
      if (!date) return false;
      const d = new Date(date);
      return d >= start && d <= end;
    })
    .sort((a, b) => {
      const da = new Date(a.domain_data?.date || 0);
      const db = new Date(b.domain_data?.date || 0);
      return da.getTime() - db.getTime();
    });

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ ...TYPE.label, marginBottom: '12px' }}>AROUND · 앞뒤 3일</div>
      {filtered.length === 0 ? (
        <div style={TYPE.sub}>이 기간에 일정이 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map((node, i) => {
            const d = node.domain_data || {};
            const date = d.date || d.when;
            const isToday = date && new Date(date).toDateString() === today.toDateString();
            return (
              <div key={node.id || i} style={{
                display: 'flex',
                gap: '12px',
                padding: '9px 0',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                opacity: new Date(date) < today ? 0.45 : 1,
              }}>
                <div style={{ minWidth: '50px', flexShrink: 0 }}>
                  <div style={{ ...TYPE.sub, fontSize: '12px', fontWeight: isToday ? 700 : 500 }}>
                    {isToday ? '오늘' : formatDateShort(date)}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={TYPE.sub}>{d.title || d.what || node.title}</div>
                  {d.time && <div style={TYPE.meta}>{formatTime(d.time)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
