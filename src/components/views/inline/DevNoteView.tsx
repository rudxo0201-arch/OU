'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

export function DevNoteView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || nodes[0]?.title || '';
  const tech = data.tech || data.language || data.framework || data.stack;
  const description = data.description || data.content || data.note;
  const tags: string[] = Array.isArray(data.tags) ? data.tags : typeof data.tags === 'string' ? data.tags.split(',').map((t: string) => t.trim()) : [];
  const techTags = tech ? (Array.isArray(tech) ? tech : [tech]) : [];
  const allTags = [...techTags, ...tags].slice(0, 5);

  if (!title) return null;

  return (
    <InlineCard label="DEV">
      <div style={{ ...TYPE.title, marginBottom: description ? '8px' : 0, fontFamily: 'monospace' }}>
        {title}
      </div>
      {description && (
        <div style={{ ...TYPE.sub, marginBottom: allTags.length ? '10px' : 0 }}>{description}</div>
      )}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
          {allTags.map((tag, i) => (
            <span key={i} style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(0,0,0,0.04)',
              color: 'var(--ou-text-secondary, #666)',
              fontWeight: 600,
              fontFamily: 'monospace',
              letterSpacing: '0.02em',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </InlineCard>
  );
}
