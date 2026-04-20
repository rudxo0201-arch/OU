'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

export function MediaRatingView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || nodes[0]?.title || '';
  const rating = data.rating || data.score || data.stars;
  const maxRating = data.max_rating || 5;
  const mediaType = data.type || data.media_type;
  const note = data.note || data.review;

  if (!title) return null;

  const ratingNum = parseFloat(String(rating)) || 0;

  return (
    <InlineCard label="MEDIA">
      <div style={{ ...TYPE.title, marginBottom: '10px' }}>{title}</div>

      {/* 별점 */}
      {rating !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: note ? '10px' : 0 }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            {Array.from({ length: maxRating }, (_, i) => (
              <span key={i} style={{
                fontSize: '18px',
                color: i < Math.floor(ratingNum)
                  ? 'var(--ou-text-primary, #1a1a1a)'
                  : 'rgba(0,0,0,0.12)',
              }}>
                ★
              </span>
            ))}
          </div>
          <span style={{ ...TYPE.emphasisMd, fontSize: '20px' }}>{ratingNum}</span>
        </div>
      )}

      {note && <div style={TYPE.sub}>{note}</div>}
    </InlineCard>
  );
}
