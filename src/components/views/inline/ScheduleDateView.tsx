'use client';

/**
 * ScheduleDateView — 날짜(일) 강조 일정 카드
 * "25일에 회식" → 25 크게
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData, formatDate, formatDayOfWeek, formatDay } from './base';

export function ScheduleDateView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || data.what || data.event || nodes[0]?.title || '';
  const date = data.date || data.when;
  const location = data.location || data.place;
  const participants = data.participants || data.with;

  if (!title && !date) return null;

  const day = formatDay(date);
  const dayOfWeek = formatDayOfWeek(date);

  return (
    <InlineCard label="SCHEDULE">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {/* 날짜 숫자 — 핵심 강조 */}
        {day && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '52px',
            padding: '8px',
            background: 'var(--ou-bg-secondary, #f0f0f3)',
            borderRadius: '12px',
            boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.06), inset -2px -2px 5px rgba(255,255,255,0.8)',
          }}>
            <span style={{ ...TYPE.emphasis, fontSize: '38px' }}>{day}</span>
            <span style={{ ...TYPE.label, marginTop: '2px' }}>{dayOfWeek}</span>
          </div>
        )}

        {/* 제목 + 부가 정보 */}
        <div style={{ flex: 1, paddingTop: '6px' }}>
          <div style={TYPE.title}>{title}</div>
          {location && (
            <div style={{ ...TYPE.sub, marginTop: '6px' }}>@ {location}</div>
          )}
          {participants && (
            <div style={{ ...TYPE.meta, marginTop: '4px' }}>
              with {Array.isArray(participants) ? participants.join(', ') : participants}
            </div>
          )}
        </div>
      </div>
    </InlineCard>
  );
}
