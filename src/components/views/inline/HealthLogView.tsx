'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData, formatAmount } from './base';

export function HealthLogView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || nodes[0]?.title || '';
  const value = data.value || data.measurement;
  const unit = data.unit || data.metric;
  const type = data.type || data.category; // blood_pressure, weight, blood_sugar 등
  const note = data.note;

  if (!title && value === undefined) return null;

  const TYPE_LABEL: Record<string, string> = {
    blood_pressure: '혈압', weight: '체중', blood_sugar: '혈당',
    heart_rate: '심박수', temperature: '체온', bmi: 'BMI',
  };

  const typeLabel = type ? (TYPE_LABEL[type] || type) : 'HEALTH';

  return (
    <InlineCard label={typeLabel.toUpperCase()}>
      {value !== undefined && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
          <span style={TYPE.emphasis}>{String(value)}</span>
          {unit && <span style={{ ...TYPE.sub, fontSize: '16px', fontWeight: 500 }}>{unit}</span>}
        </div>
      )}
      {title && <div style={TYPE.sub}>{title}</div>}
      {note && <div style={{ ...TYPE.meta, marginTop: '6px' }}>{note}</div>}
    </InlineCard>
  );
}
