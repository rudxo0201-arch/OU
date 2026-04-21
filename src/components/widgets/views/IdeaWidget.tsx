'use client';

import { useState, useEffect } from 'react';
import { WidgetEmptyState } from '../WidgetEmptyState';

interface IdeaNode {
  id: string;
  domain_data: {
    title?: string;
    category?: string;
  };
  raw?: string;
  created_at: string;
}

export function IdeaWidget() {
  const [ideas, setIdeas] = useState<IdeaNode[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/nodes?domain=idea&limit=10')
      .then(r => r.json())
      .then(d => {
        const nodes = (d.nodes || []).filter((n: IdeaNode) => n.domain_data?.title);
        setIdeas(nodes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '14px 16px',
    }}>
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: 'var(--ou-text-dimmed)',
        letterSpacing: '0.10em', textTransform: 'uppercase',
        fontFamily: 'var(--ou-font-logo)',
        marginBottom: 12, flexShrink: 0,
      }}>
        아이디어
      </span>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>불러오는 중...</div>
        ) : ideas.length === 0 ? (
          <WidgetEmptyState skeleton="idea" />
        ) : ideas.map(idea => (
          <div key={idea.id} style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-raised-sm)',
            fontSize: 12, fontWeight: 500,
            color: 'var(--ou-text-strong)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {idea.domain_data.title || idea.raw?.slice(0, 40) || '아이디어'}
          </div>
        ))}
      </div>
    </div>
  );
}
