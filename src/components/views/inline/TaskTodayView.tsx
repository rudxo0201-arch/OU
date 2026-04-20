'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE } from './base';

export function TaskTodayView({ nodes }: ViewProps) {
  const today = new Date().toDateString();
  const todayTasks = nodes.filter(n => {
    if (n.domain_data?.status === 'done') return false;
    const due = n.domain_data?.deadline || n.domain_data?.due_date || n.domain_data?.date;
    if (!due) return true; // 마감일 없는 것도 포함
    return new Date(due).toDateString() === today;
  });

  const doneTasks = nodes.filter(n => n.domain_data?.status === 'done');

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={TYPE.label}>TODAY</div>
        {doneTasks.length > 0 && (
          <div style={TYPE.meta}>{doneTasks.length}개 완료</div>
        )}
      </div>
      {todayTasks.length === 0 ? (
        <div style={TYPE.sub}>오늘 할 일이 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {todayTasks.map((node, i) => (
            <div key={node.id || i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 0',
              borderBottom: i < todayTasks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                background: 'var(--ou-bg-secondary, #f0f0f3)',
                boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.07), inset -2px -2px 4px rgba(255,255,255,0.8)',
              }} />
              <span style={TYPE.sub}>{node.domain_data?.title || node.domain_data?.task || node.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
