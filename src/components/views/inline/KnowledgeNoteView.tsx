'use client';

/**
 * KnowledgeNoteView — 지식/메모 노트 카드
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

export function KnowledgeNoteView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || data.topic || data.subject || nodes[0]?.title || '';
  const summary = data.summary || data.content || data.description;
  const source = data.source || data.from;
  const tags = data.tags || data.keywords;

  if (!title) return null;

  const tagList: string[] = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : [];

  return (
    <InlineCard label="KNOWLEDGE">
      <div style={{ ...TYPE.title, marginBottom: summary ? '8px' : 0 }}>{title}</div>

      {summary && (
        <div style={{
          ...TYPE.sub,
          marginBottom: tagList.length ? '12px' : 0,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden',
        }}>
          {summary}
        </div>
      )}

      {tagList.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {tagList.slice(0, 4).map((tag, i) => (
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

      {source && (
        <div style={{ ...TYPE.meta, marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          출처: {source}
        </div>
      )}
    </InlineCard>
  );
}
