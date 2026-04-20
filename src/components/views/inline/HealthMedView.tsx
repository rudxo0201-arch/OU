'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData, formatTime } from './base';

export function HealthMedView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const medicine = data.medicine || data.medication || data.drug || data.title || nodes[0]?.title || '';
  const time = data.time || data.taken_at;
  const dosage = data.dosage || data.amount || data.dose;
  const note = data.note;

  if (!medicine) return null;

  return (
    <InlineCard label="MEDICATION">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ flex: 1 }}>
          <div style={TYPE.emphasisMd}>{medicine}</div>
          {dosage && <div style={{ ...TYPE.meta, marginTop: '4px' }}>{dosage}</div>}
        </div>
        {time && (
          <div style={{ ...TYPE.sub, flexShrink: 0, fontWeight: 600 }}>
            {formatTime(time)}
          </div>
        )}
      </div>
      {note && <div style={{ ...TYPE.meta, marginTop: '10px' }}>{note}</div>}
    </InlineCard>
  );
}
