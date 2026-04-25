'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE } from './base';

export function ScheduleTomorrowView({ nodes }: ViewProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toDateString();

  const tomorrowNodes = nodes.filter(n => {
    const date = n.domain_data?.date || n.domain_data?.when;
    if (!date) return false;
    return new Date(date).toDateString() === tomorrowStr;
  });

  const label = tomorrow.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div style={{ ...NEU.card, display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...TYPE.label, marginBottom: '12px' }}>TOMORROW · {label.toUpperCase()}</div>
      {tomorrowNodes.length === 0 ? (
        <div style={TYPE.sub}>내일 일정이 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {tomorrowNodes.map((node, i) => {
            const d = node.domain_data || {};
            const time = d.time;
            const title = d.title || d.what || node.title || '';
            return (
              <div key={node.id || i} style={{
                display: 'flex',
                gap: '14px',
                padding: '10px 0',
                borderBottom: i < tomorrowNodes.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <div style={{ ...TYPE.sub, minWidth: '44px', fontWeight: 600, flexShrink: 0 }}>{time || '—'}</div>
                <div style={TYPE.sub}>{title}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
