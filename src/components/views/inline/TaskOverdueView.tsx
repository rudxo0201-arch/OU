'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE, getDDay, formatDate } from './base';

export function TaskOverdueView({ nodes }: ViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = nodes.filter(n => {
    if (n.domain_data?.status === 'done') return false;
    const due = n.domain_data?.deadline || n.domain_data?.due_date;
    if (!due) return false;
    return new Date(due) < today;
  }).sort((a, b) => {
    const da = new Date(a.domain_data?.deadline || 0);
    const db = new Date(b.domain_data?.deadline || 0);
    return da.getTime() - db.getTime();
  });

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ ...TYPE.label, marginBottom: '12px' }}>
        OVERDUE {overdue.length > 0 && `· ${overdue.length}개`}
      </div>
      {overdue.length === 0 ? (
        <div style={TYPE.sub}>밀린 할 일이 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {overdue.map((node, i) => {
            const d = node.domain_data || {};
            const dday = getDDay(d.deadline || d.due_date);
            return (
              <div key={node.id || i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 0',
                borderBottom: i < overdue.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                  background: 'var(--ou-bg-secondary, #f0f0f3)',
                  boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.07), inset -2px -2px 4px rgba(255,255,255,0.8)',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={TYPE.sub}>{d.title || d.task || node.title}</div>
                  <div style={TYPE.meta}>{formatDate(d.deadline || d.due_date)}</div>
                </div>
                {dday && (
                  <div style={{ ...TYPE.meta, fontWeight: 700 }}>{dday}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
