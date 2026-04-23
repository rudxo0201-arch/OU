'use client';

/**
 * ScheduleTodayView — 오늘 일정 타임라인
 */

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE } from './base';

function isToday(n: any): boolean {
  const raw = n.domain_data?.date || n.domain_data?.when;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === 'today' || s === '오늘') return true;
    if (s === 'tomorrow' || s === '내일' || s === 'yesterday' || s === '어제') return false;
  }

  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }
  }

  if (n.created_at) {
    const c = new Date(n.created_at);
    if (!isNaN(c.getTime())) {
      c.setHours(0, 0, 0, 0);
      return c.getTime() === today.getTime();
    }
  }
  return false;
}

export function ScheduleTodayView({ nodes }: ViewProps) {
  const todayNodes = nodes.filter(isToday);

  const label = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div style={{ ...NEU.card, display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ ...TYPE.label, marginBottom: '12px' }}>TODAY · {label.toUpperCase()}</div>
      {todayNodes.length === 0 ? (
        <div style={TYPE.sub}>오늘 일정이 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {todayNodes.map((node, i) => {
            const d = node.domain_data || {};
            const time = d.time || d.datetime;
            const title = d.title || d.what || node.title || '';
            return (
              <div key={node.id || i} style={{
                display: 'flex',
                gap: '14px',
                padding: '10px 0',
                borderBottom: i < todayNodes.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <div style={{ ...TYPE.sub, minWidth: '44px', fontWeight: 600, flexShrink: 0 }}>
                  {time || '—'}
                </div>
                <div style={TYPE.sub}>{title}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
