'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, NEU, extractData } from './base';

export function YoutubeTimestampView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || nodes[0]?.title || '';
  const timestamp = data.timestamp || data.time;
  const note = data.note || data.memo;
  const videoTitle = data.video_title || data.video;

  if (!title && !note) return null;

  return (
    <InlineCard label="YOUTUBE · MEMO">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {timestamp && (
          <div style={{
            ...NEU.pill,
            flexShrink: 0,
            padding: '5px 10px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'monospace' }}>
              {timestamp}
            </span>
          </div>
        )}
        <div style={{ flex: 1 }}>
          {videoTitle && <div style={{ ...TYPE.meta, marginBottom: '4px' }}>{videoTitle}</div>}
          <div style={TYPE.sub}>{note || title}</div>
        </div>
      </div>
    </InlineCard>
  );
}
