'use client';

/**
 * TaskDeadlineView — 마감 D-day 강조 할 일 카드
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, NEU, extractData, getDDay, formatDate } from './base';

export function TaskDeadlineView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || data.task || nodes[0]?.title || '';
  const deadline = data.deadline || data.due_date || data.due || data.date;
  const description = data.description || data.detail;

  if (!title) return null;

  const dday = getDDay(deadline);
  const isUrgent = dday && (dday === 'D-day' || dday.startsWith('D-') && parseInt(dday.slice(2)) <= 3);

  return (
    <InlineCard label="TASK">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* 체크박스 */}
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '6px',
          flexShrink: 0,
          marginTop: '2px',
          boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.8)',
          background: 'var(--ou-bg-secondary, #f0f0f3)',
        }} />

        <div style={{ flex: 1 }}>
          <div style={TYPE.title}>{title}</div>
          {description && <div style={{ ...TYPE.sub, marginTop: '4px' }}>{description}</div>}
        </div>

        {/* D-day 뱃지 */}
        {dday && (
          <div style={{
            ...NEU.pill,
            padding: '4px 10px',
            boxShadow: isUrgent
              ? 'inset 2px 2px 4px rgba(0,0,0,0.08), inset -2px -2px 4px rgba(255,255,255,0.8)'
              : '3px 3px 7px rgba(0,0,0,0.06), -3px -3px 7px rgba(255,255,255,0.8)',
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: isUrgent ? 'var(--ou-text-primary, #1a1a1a)' : 'var(--ou-text-secondary, #666)',
              letterSpacing: '-0.01em',
            }}>
              {dday}
            </span>
          </div>
        )}
      </div>

      {deadline && (
        <div style={{ ...TYPE.meta, marginTop: '10px' }}>{formatDate(deadline)} 마감</div>
      )}
    </InlineCard>
  );
}
