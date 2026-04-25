'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE, getDDay, formatDate } from './base';

export type TaskListFilter = 'today' | 'overdue' | 'week';

interface TaskListViewProps extends ViewProps {
  filter?: TaskListFilter;
}

const LABELS: Record<TaskListFilter, string> = {
  today: 'TODAY',
  overdue: 'OVERDUE',
  week: 'THIS WEEK',
};

const EMPTY: Record<TaskListFilter, string> = {
  today: '오늘 할 일이 없어요.',
  overdue: '밀린 할 일이 없어요.',
  week: '이번 주 할 일이 없어요.',
};

function filterTasks(nodes: any[], filter: TaskListFilter): any[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);

  return nodes.filter(n => {
    if (n.domain_data?.status === 'done') return false;
    const due = n.domain_data?.deadline || n.domain_data?.due_date || n.domain_data?.date;

    if (filter === 'today') {
      if (!due) return true;
      return new Date(due).toDateString() === today.toDateString();
    }
    if (filter === 'overdue') {
      if (!due) return false;
      const d = new Date(due); d.setHours(0, 0, 0, 0);
      return d < today;
    }
    if (filter === 'week') {
      if (!due) return false;
      const d = new Date(due); d.setHours(0, 0, 0, 0);
      return d >= today && d <= weekEnd;
    }
    return false;
  }).sort((a, b) => {
    const da = new Date(a.domain_data?.deadline || a.domain_data?.due_date || 0);
    const db = new Date(b.domain_data?.deadline || b.domain_data?.due_date || 0);
    return da.getTime() - db.getTime();
  });
}

export function TaskListView({ nodes, filters }: TaskListViewProps) {
  const filter: TaskListFilter = (filters?.filter as TaskListFilter) ?? 'today';
  const tasks = filterTasks(nodes, filter);
  const doneTasks = nodes.filter(n => n.domain_data?.status === 'done');

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={TYPE.label}>
          {LABELS[filter]}{tasks.length > 0 && filter !== 'today' ? ` · ${tasks.length}개` : ''}
        </div>
        {filter === 'today' && doneTasks.length > 0 && (
          <div style={TYPE.meta}>{doneTasks.length}개 완료</div>
        )}
      </div>
      {tasks.length === 0 ? (
        <div style={TYPE.sub}>{EMPTY[filter]}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tasks.map((node, i) => {
            const d = node.domain_data || {};
            const dday = getDDay(d.deadline || d.due_date);
            const showDate = filter !== 'today';
            return (
              <div key={node.id || i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 0',
                borderBottom: i < tasks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                  background: 'var(--ou-bg-secondary, #f0f0f3)',
                  boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.07), inset -2px -2px 4px rgba(255,255,255,0.8)',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={TYPE.sub}>{d.title || d.task || node.title}</div>
                  {showDate && (d.deadline || d.due_date) && (
                    <div style={TYPE.meta}>{formatDate(d.deadline || d.due_date)}</div>
                  )}
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
