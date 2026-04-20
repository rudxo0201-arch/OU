'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE, formatAmount } from './base';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function FinanceWeekView({ nodes }: ViewProps) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const amountByDay = week.map(day => {
    const key = day.toDateString();
    return nodes.filter(n => {
      const date = n.domain_data?.date || n.created_at;
      return date && new Date(date).toDateString() === key;
    }).reduce((sum, n) => sum + (parseFloat(String(n.domain_data?.amount || 0)) || 0), 0);
  });

  const maxAmount = Math.max(...amountByDay, 1);
  const total = amountByDay.reduce((a, b) => a + b, 0);

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
        <div style={TYPE.label}>THIS WEEK</div>
        <div style={{ ...TYPE.sub, fontWeight: 700 }}>{formatAmount(total)}원</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '60px' }}>
        {week.map((day, i) => {
          const isToday = day.toDateString() === today.toDateString();
          const height = amountByDay[i] > 0 ? Math.max((amountByDay[i] / maxAmount) * 52, 4) : 4;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '100%',
                height: `${height}px`,
                borderRadius: '4px 4px 0 0',
                background: amountByDay[i] > 0
                  ? (isToday ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)')
                  : 'rgba(0,0,0,0.04)',
                transition: 'height 0.3s ease',
              }} />
              <div style={{ ...TYPE.meta, fontSize: '10px', fontWeight: isToday ? 700 : 400 }}>
                {DAYS[day.getDay()]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
