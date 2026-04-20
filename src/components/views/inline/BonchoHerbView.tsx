'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

export function BonchoHerbView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const name = data.name || data.herb || data.title || nodes[0]?.title || '';
  const chinese = data.chinese || data.hanja || data.chinese_name;
  const nature = data.nature || data.sung; // 性
  const flavor = data.flavor || data.mi; // 味
  const meridian = data.meridian || data.gwi; // 歸經
  const effect = data.effect || data.efficacy || data.action;

  if (!name) return null;

  return (
    <InlineCard label="本草">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
        <span style={TYPE.emphasisMd}>{name}</span>
        {chinese && (
          <span style={{ fontSize: '20px', fontWeight: 300, color: 'var(--ou-text-secondary, #666)' }}>
            {chinese}
          </span>
        )}
      </div>

      {(nature || flavor || meridian) && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
          {nature && (
            <div>
              <div style={TYPE.label}>性</div>
              <div style={TYPE.sub}>{nature}</div>
            </div>
          )}
          {flavor && (
            <div>
              <div style={TYPE.label}>味</div>
              <div style={TYPE.sub}>{flavor}</div>
            </div>
          )}
          {meridian && (
            <div>
              <div style={TYPE.label}>歸經</div>
              <div style={TYPE.sub}>{meridian}</div>
            </div>
          )}
        </div>
      )}

      {effect && (
        <div style={{ ...TYPE.sub, paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          {Array.isArray(effect) ? effect.join(' · ') : effect}
        </div>
      )}
    </InlineCard>
  );
}
