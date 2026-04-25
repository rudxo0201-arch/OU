'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE, formatDateShort, formatTime } from './base';

export type ScheduleListFilter = 'today' | 'tomorrow' | 'around';

interface ScheduleListViewProps extends ViewProps {
  filter?: ScheduleListFilter;
}

function getTargetDay(filter: ScheduleListFilter): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (filter === 'tomorrow') d.setDate(d.getDate() + 1);
  return d;
}

function matchesFilter(node: any, filter: ScheduleListFilter, today: Date): boolean {
  const raw = node.domain_data?.date || node.domain_data?.when;

  if (filter === 'around') {
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    const start = new Date(today); start.setDate(today.getDate() - 3);
    const end = new Date(today); end.setDate(today.getDate() + 3);
    d.setHours(0, 0, 0, 0);
    return d >= start && d <= end;
  }

  const target = getTargetDay(filter);

  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (filter === 'today' && (s === 'today' || s === '오늘')) return true;
    if (filter === 'tomorrow' && (s === 'tomorrow' || s === '내일')) return true;
    if (s === 'today' || s === '오늘' || s === 'tomorrow' || s === '내일' || s === 'yesterday' || s === '어제') return false;
  }

  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d.getTime() === target.getTime();
    }
  }

  if (filter === 'today' && node.created_at) {
    const c = new Date(node.created_at);
    if (!isNaN(c.getTime())) {
      c.setHours(0, 0, 0, 0);
      return c.getTime() === today.getTime();
    }
  }

  return false;
}

const LABELS: Record<ScheduleListFilter, string> = {
  today: 'TODAY',
  tomorrow: 'TOMORROW',
  around: 'AROUND · 앞뒤 3일',
};

const EMPTY: Record<ScheduleListFilter, string> = {
  today: '오늘 일정이 없어요.',
  tomorrow: '내일 일정이 없어요.',
  around: '이 기간에 일정이 없어요.',
};

export function ScheduleListView({ nodes, filters }: ScheduleListViewProps) {
  const filter: ScheduleListFilter = (filters?.filter as ScheduleListFilter) ?? 'today';
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const header = filter === 'today'
    ? `TODAY · ${new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).toUpperCase()}`
    : LABELS[filter];

  const filtered = nodes
    .filter(n => matchesFilter(n, filter, today))
    .sort((a, b) => {
      const ta = a.domain_data?.date || a.domain_data?.when || '';
      const tb = b.domain_data?.date || b.domain_data?.when || '';
      return new Date(ta).getTime() - new Date(tb).getTime();
    });

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ ...TYPE.label, marginBottom: '12px' }}>{header}</div>
      {filtered.length === 0 ? (
        <div style={TYPE.sub}>{EMPTY[filter]}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map((node, i) => {
            const d = node.domain_data || {};
            const dateStr = d.date || d.when;
            const isPast = filter === 'around' && dateStr && new Date(dateStr) < today;
            return (
              <div key={node.id || i} style={{
                display: 'flex',
                gap: '14px',
                padding: '9px 0',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                opacity: isPast ? 0.45 : 1,
              }}>
                <div style={{ minWidth: '50px', flexShrink: 0 }}>
                  {filter === 'around' ? (
                    <div style={{ ...TYPE.sub, fontSize: '12px', fontWeight: dateStr && new Date(dateStr).toDateString() === today.toDateString() ? 700 : 500 }}>
                      {dateStr && new Date(dateStr).toDateString() === today.toDateString() ? '오늘' : formatDateShort(dateStr)}
                    </div>
                  ) : (
                    <div style={{ ...TYPE.sub, minWidth: '44px', fontWeight: 600 }}>
                      {d.time ? formatTime(d.time) : '—'}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={TYPE.sub}>{d.title || d.what || node.title || ''}</div>
                  {filter === 'around' && d.time && (
                    <div style={TYPE.meta}>{formatTime(d.time)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
