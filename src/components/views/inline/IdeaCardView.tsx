'use client';

/**
 * IdeaCardView — 아이디어 카드
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

export function IdeaCardView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || data.idea || nodes[0]?.title || '';
  const description = data.description || data.detail || data.content;
  const tags = data.tags || data.category;

  if (!title) return null;

  const tagList: string[] = Array.isArray(tags) ? tags : typeof tags === 'string' ? [tags] : [];

  return (
    <InlineCard label="IDEA">
      <div style={{ ...TYPE.emphasisMd, marginBottom: '8px', lineHeight: 1.3 }}>{title}</div>

      {description && (
        <div style={{ ...TYPE.sub, marginBottom: tagList.length ? '12px' : 0 }}>
          {description}
        </div>
      )}

      {tagList.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
          {tagList.map((tag, i) => (
            <span key={i} style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'var(--ou-bg-secondary, #f0f0f3)',
              boxShadow: '2px 2px 4px rgba(0,0,0,0.05), -2px -2px 4px rgba(255,255,255,0.8)',
              color: 'var(--ou-text-secondary, #666)',
              fontWeight: 500,
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </InlineCard>
  );
}
