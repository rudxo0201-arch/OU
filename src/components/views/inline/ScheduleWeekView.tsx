'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE } from './base';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function ScheduleWeekView({ nodes }: ViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 이번 주 월~일
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const nodesByDate = new Map<string, any[]>();
  nodes.forEach(n => {
    const date = n.domain_data?.date || n.domain_data?.when;
    if (!date) return;
    const key = new Date(date).toDateString();
    if (!nodesByDate.has(key)) nodesByDate.set(key, []);
    nodesByDate.get(key)!.push(n);
  });

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ ...TYPE.label, marginBottom: '14px' }}>THIS WEEK</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {week.map((day, i) => {
          const key = day.toDateString();
          const dayNodes = nodesByDate.get(key) || [];
          const isToday = key === today.toDateString();

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ ...TYPE.meta, fontSize: '10px' }}>{DAYS[day.getDay()]}</div>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: isToday ? 700 : 400,
                color: 'var(--ou-text-primary, #1a1a1a)',
                background: isToday ? 'rgba(0,0,0,0.06)' : 'transparent',
                boxShadow: isToday
                  ? 'inset 2px 2px 4px rgba(0,0,0,0.07), inset -2px -2px 4px rgba(255,255,255,0.8)'
                  : 'none',
              }}>
                {day.getDate()}
              </div>
              {dayNodes.slice(0, 2).map((n, j) => (
                <div key={j} style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.2)',
                }} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
