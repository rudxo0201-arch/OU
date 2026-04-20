'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

export function LocationPinView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const name = data.name || data.place || data.location || nodes[0]?.title || '';
  const address = data.address || data.addr;
  const category = data.category || data.type;
  const note = data.note || data.memo;

  if (!name) return null;

  return (
    <InlineCard label={category ? `LOCATION · ${category.toUpperCase()}` : 'LOCATION'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '-2px' }}>📍</span>
        <div style={{ flex: 1 }}>
          <div style={TYPE.emphasisMd}>{name}</div>
          {address && <div style={{ ...TYPE.sub, marginTop: '4px' }}>{address}</div>}
          {note && <div style={{ ...TYPE.meta, marginTop: '6px' }}>{note}</div>}
        </div>
      </div>
    </InlineCard>
  );
}
