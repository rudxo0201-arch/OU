'use client';

/**
 * ScheduleTimeView — 시간 강조 일정 카드
 * "3시에 부인 시험" → 15:00 크게
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, NEU, extractData, formatDate, formatDayOfWeek, formatTime } from './base';

export function ScheduleTimeView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const time = formatTime(data.time || data.datetime);
  const title = data.title || data.what || data.event || nodes[0]?.title || '';
  const date = data.date || data.when;
  const location = data.location || data.place || data.where;
  const participants = data.participants || data.with || data.people;

  if (!title && !time) return null;

  return (
    <InlineCard label="SCHEDULE">
      {/* 날짜 + 요일 */}
      {date && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <span style={TYPE.sub}>{formatDate(date)}</span>
          <span style={{ ...TYPE.meta, opacity: 0.7 }}>{formatDayOfWeek(date)}</span>
        </div>
      )}

      {/* 시간 — 핵심 강조 */}
      {time && (
        <div style={{ ...TYPE.emphasis, marginBottom: '6px' }}>{time}</div>
      )}

      {/* 제목 */}
      <div style={{ ...TYPE.title, marginBottom: location || participants ? '12px' : 0 }}>
        {title}
      </div>

      {/* 부가 정보 */}
      {(location || participants) && (
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}>
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={TYPE.meta}>@</span>
              <span style={TYPE.sub}>{location}</span>
            </div>
          )}
          {participants && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={TYPE.meta}>with</span>
              <span style={TYPE.sub}>{Array.isArray(participants) ? participants.join(', ') : participants}</span>
            </div>
          )}
        </div>
      )}
    </InlineCard>
  );
}
