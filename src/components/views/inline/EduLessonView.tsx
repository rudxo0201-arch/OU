'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData, formatDate } from './base';

export function EduLessonView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const subject = data.subject || data.course || data.class || nodes[0]?.title || '';
  const topic = data.topic || data.chapter || data.title;
  const date = data.date;
  const instructor = data.instructor || data.teacher || data.professor;
  const note = data.note || data.summary;

  if (!subject) return null;

  return (
    <InlineCard label="LESSON">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{ ...TYPE.emphasisMd }}>{subject}</div>
        {date && <div style={TYPE.meta}>{formatDate(date)}</div>}
      </div>
      {topic && <div style={{ ...TYPE.sub, marginBottom: '6px' }}>{topic}</div>}
      {instructor && <div style={TYPE.meta}>{instructor}</div>}
      {note && (
        <div style={{ ...TYPE.sub, marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {note}
        </div>
      )}
    </InlineCard>
  );
}
