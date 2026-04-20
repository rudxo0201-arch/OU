'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, NEU, extractData } from './base';

export function DictCharView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const char = data.char || data.character || data.hanja || data.title || nodes[0]?.title || '';
  const reading = data.reading || data.sound || data.pronunciation; // 음
  const meaning = data.meaning || data.definition; // 훈
  const strokes = data.strokes || data.stroke_count;
  const radical = data.radical || data.bushu;

  if (!char) return null;

  return (
    <InlineCard label="字">
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* 한자 크게 */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          ...NEU.cardPressed,
          padding: 0,
          boxShadow: 'inset 3px 3px 7px rgba(0,0,0,0.07), inset -3px -3px 7px rgba(255,255,255,0.8)',
        }}>
          <span style={{ fontSize: '40px', lineHeight: 1, color: 'var(--ou-text-primary, #1a1a1a)' }}>
            {char}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          {reading && <div style={{ ...TYPE.emphasisMd, marginBottom: '2px' }}>{reading}</div>}
          {meaning && <div style={TYPE.sub}>{meaning}</div>}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {strokes && <div style={TYPE.meta}>{strokes}획</div>}
            {radical && <div style={TYPE.meta}>부수: {radical}</div>}
          </div>
        </div>
      </div>
    </InlineCard>
  );
}
