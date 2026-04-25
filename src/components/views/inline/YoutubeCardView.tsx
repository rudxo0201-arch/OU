'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

export function YoutubeCardView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || nodes[0]?.title || '';
  const channel = data.channel || data.creator || data.author;
  const thumbnailUrl = data.thumbnail_url || data.thumbnail;
  const note = data.note;

  if (!title) return null;

  return (
    <InlineCard label="YOUTUBE" style={{ padding: 0, overflow: 'hidden' }}>
      {thumbnailUrl && (
        <div style={{
          width: '100%',
          height: '120px',
          backgroundImage: `url(${thumbnailUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '14px 14px 0 0',
        }} />
      )}
      <div style={{ padding: '14px 16px' }}>
        {!thumbnailUrl && <div style={{ ...TYPE.label, marginBottom: '8px' }}>YOUTUBE</div>}
        <div style={TYPE.title}>{title}</div>
        {channel && <div style={{ ...TYPE.meta, marginTop: '4px' }}>{channel}</div>}
        {note && <div style={{ ...TYPE.sub, marginTop: '8px' }}>{note}</div>}
      </div>
    </InlineCard>
  );
}
