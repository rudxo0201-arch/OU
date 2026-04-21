'use client';

import { useState, useEffect } from 'react';
import { cleanDisplayText } from '@/lib/utils/cleanDisplayText';
import { WidgetEmptyState } from '../WidgetEmptyState';

interface TaskNode {
  id: string;
  domain_data: {
    title?: string;
    deadline?: string;
    status?: string;
    priority?: string;
  };
  raw?: string;
  created_at: string;
}

export function TaskWidget() {
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/nodes?domain=task&limit=20')
      .then(r => r.json())
      .then(d => {
        const nodes: TaskNode[] = d.nodes || [];
        const pending = nodes.filter(n =>
          n.domain_data?.title &&
          (!n.domain_data?.status || n.domain_data.status === 'pending' || n.domain_data.status === 'in_progress')
        );
        setTasks(pending.slice(0, 8));
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
        할 일
      </span>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>불러오는 중...</div>
        ) : tasks.length === 0 ? (
          <WidgetEmptyState skeleton="task" />
        ) : tasks.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{
              width: 14, height: 14,
              borderRadius: 4,
              border: '1.5px solid var(--ou-border-medium)',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
              flexShrink: 0,
              marginTop: 1,
            }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 12, fontWeight: 500,
                color: 'var(--ou-text-strong)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {t.domain_data.title
                  ? cleanDisplayText(t.domain_data.title)
                  : cleanDisplayText(t.raw?.slice(0, 50) ?? '') || '할 일'}
              </div>
              {t.domain_data.deadline && (
                <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 1 }}>
                  {t.domain_data.deadline}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
