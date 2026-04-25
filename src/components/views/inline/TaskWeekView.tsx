'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE, getDDay } from './base';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function TaskWeekView({ nodes }: ViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + 7);

  const weekTasks = nodes
    .filter(n => {
      if (n.domain_data?.status === 'done') return false;
      const due = n.domain_data?.deadline || n.domain_data?.due_date || n.domain_data?.date;
      if (!due) return false;
      const d = new Date(due);
      return d >= today && d <= end;
    })
    .sort((a, b) => {
      const da = new Date(a.domain_data?.deadline || a.domain_data?.due_date || 0);
      const db = new Date(b.domain_data?.deadline || b.domain_data?.due_date || 0);
      return da.getTime() - db.getTime();
    });

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ ...TYPE.label, marginBottom: '12px' }}>THIS WEEK · TASKS</div>
      {weekTasks.length === 0 ? (
        <div style={TYPE.sub}>이번 주 할 일이 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {weekTasks.map((node, i) => {
            const d = node.domain_data || {};
            const due = d.deadline || d.due_date || d.date;
            const dueDate = due ? new Date(due) : null;
            const dayLabel = dueDate ? DAYS[dueDate.getDay()] : '';
            const dday = getDDay(due);
            return (
              <div key={node.id || i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 0',
                borderBottom: i < weekTasks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                  background: 'var(--ou-bg-secondary, #f0f0f3)',
                  boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.07), inset -2px -2px 4px rgba(255,255,255,0.8)',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={TYPE.sub}>{d.title || d.task || node.title}</div>
                </div>
                {dayLabel && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ ...TYPE.meta, fontSize: '10px' }}>{dayLabel}</div>
                    {dday && <div style={{ ...TYPE.meta, fontWeight: 700 }}>{dday}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
