'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, NEU, extractData, getDDay, formatDate } from './base';

export function EduAssignmentView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || data.assignment || data.task || nodes[0]?.title || '';
  const subject = data.subject || data.course;
  const deadline = data.deadline || data.due_date || data.due;
  const note = data.note;

  if (!title) return null;

  const dday = getDDay(deadline);
  const isUrgent = dday && (dday === 'D-day' || (dday.startsWith('D-') && parseInt(dday.slice(2)) <= 3));

  return (
    <InlineCard label="ASSIGNMENT">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, marginTop: '1px',
          background: 'var(--ou-bg-secondary, #f0f0f3)',
          boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.8)',
        }} />
        <div style={{ flex: 1 }}>
          {subject && <div style={TYPE.meta}>{subject}</div>}
          <div style={{ ...TYPE.title, marginTop: subject ? '4px' : 0 }}>{title}</div>
          {note && <div style={{ ...TYPE.sub, marginTop: '4px' }}>{note}</div>}
        </div>
        {dday && (
          <div style={{ ...NEU.pill, padding: '4px 10px', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: isUrgent ? 'var(--ou-text-primary, #1a1a1a)' : 'var(--ou-text-secondary, #666)' }}>
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
