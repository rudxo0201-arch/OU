'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

const TYPE_LABEL: Record<string, string> = {
  movie: '영화', film: '영화', drama: '드라마', series: '드라마',
  book: '책', novel: '소설', music: '음악', song: '음악',
  podcast: '팟캐스트', game: '게임', youtube: 'YouTube',
};

export function MediaCardView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || nodes[0]?.title || '';
  const mediaType = data.type || data.media_type || data.genre;
  const creator = data.creator || data.author || data.director || data.artist || data.channel;
  const note = data.note || data.comment;

  if (!title) return null;

  const typeLabel = mediaType ? (TYPE_LABEL[mediaType.toLowerCase()] || mediaType) : null;

  return (
    <InlineCard label={typeLabel ? `MEDIA · ${typeLabel.toUpperCase()}` : 'MEDIA'}>
      <div style={{ ...TYPE.title, marginBottom: creator ? '6px' : 0 }}>{title}</div>
      {creator && <div style={TYPE.sub}>{creator}</div>}
      {note && <div style={{ ...TYPE.meta, marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>{note}</div>}
    </InlineCard>
  );
}
