'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

export function HealthSymptomView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const symptom = data.symptom || data.title || nodes[0]?.title || '';
  const severity = data.severity || data.level; // mild | moderate | severe
  const note = data.note || data.description;

  if (!symptom) return null;

  const severityLabel: Record<string, string> = { mild: '경미', moderate: '보통', severe: '심함' };

  return (
    <InlineCard label="SYMPTOM">
      <div style={{ ...TYPE.emphasisMd, marginBottom: '8px' }}>{symptom}</div>
      {severity && (
        <div style={{ ...TYPE.meta, marginBottom: '6px' }}>
          강도: {severityLabel[severity] || severity}
        </div>
      )}
      {note && <div style={TYPE.sub}>{note}</div>}
    </InlineCard>
  );
}
