'use client';

/**
 * ScheduleRangeView — 기간 일정 카드
 * "1~20일 여행" → 4/1 ━━━ 4/20
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData, formatDateShort } from './base';

export function ScheduleRangeView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || data.what || data.event || nodes[0]?.title || '';
  const startDate = data.start_date || data.date_start || data.date;
  const endDate = data.end_date || data.date_end;
  const location = data.location || data.place;

  if (!title) return null;

  const getDuration = () => {
    if (!startDate || !endDate) return null;
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return `${diff}일`;
    } catch { return null; }
  };

  const duration = getDuration();

  return (
    <InlineCard label="SCHEDULE">
      {/* 제목 */}
      <div style={{ ...TYPE.title, marginBottom: '14px' }}>{title}</div>

      {/* 기간 바 */}
      {(startDate || endDate) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={TYPE.emphasisMd}>{formatDateShort(startDate)}</span>
          <div style={{
            flex: 1,
            height: '2px',
            background: 'linear-gradient(to right, rgba(0,0,0,0.15), rgba(0,0,0,0.05))',
            borderRadius: '1px',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '-8px',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: 'var(--ou-text-tertiary, #aaa)',
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}>
              {duration}
            </div>
          </div>
          <span style={TYPE.emphasisMd}>{formatDateShort(endDate)}</span>
        </div>
      )}

      {location && (
        <div style={{ ...TYPE.meta, marginTop: '8px' }}>@ {location}</div>
      )}
    </InlineCard>
  );
}
