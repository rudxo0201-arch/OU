'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

export function HabitStreakView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const activity = data.activity || data.habit || nodes[0]?.title || '습관';

  // 연속 일수 계산
  const dates = nodes
    .map(n => {
      const d = n.domain_data?.date || n.created_at;
      return d ? new Date(d).toDateString() : null;
    })
    .filter(Boolean) as string[];

  const uniqueDates = Array.from(new Set(dates)).sort().reverse();

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    if (uniqueDates[i] === expected.toDateString()) streak++;
    else break;
  }

  return (
    <InlineCard label="STREAK">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ ...TYPE.emphasis, fontSize: '40px' }}>{streak}</div>
          <div style={TYPE.label}>일 연속</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={TYPE.title}>{activity}</div>
          <div style={{ display: 'flex', gap: '3px', marginTop: '10px', flexWrap: 'wrap' }}>
            {Array.from({ length: Math.min(streak, 14) }, (_, i) => (
              <div key={i} style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: `rgba(0,0,0,${0.1 + (i / 14) * 0.25})`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </InlineCard>
  );
}
