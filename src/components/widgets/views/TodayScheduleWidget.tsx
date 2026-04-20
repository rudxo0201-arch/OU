'use client';

import { useState, useEffect } from 'react';

interface ScheduleNode {
  id: string;
  domain_data: {
    date?: string;
    time?: string;
    title?: string;
    location?: string;
  };
  raw?: string;
}

export function TodayScheduleWidget() {
  const [events, setEvents] = useState<ScheduleNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch('/api/nodes?domain=schedule&limit=50')
      .then(r => r.json())
      .then(d => {
        const nodes: ScheduleNode[] = d.nodes || [];
        const todayEvents = nodes
          .filter(n => n.domain_data?.date === today)
          .sort((a, b) => (a.domain_data.time || '').localeCompare(b.domain_data.time || ''));
        setEvents(todayEvents);
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
      {/* 헤더 */}
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: 'var(--ou-text-dimmed)',
        letterSpacing: '0.10em', textTransform: 'uppercase',
        fontFamily: 'var(--ou-font-logo)',
        marginBottom: 12, flexShrink: 0,
      }}>
        오늘 일정
      </span>

      {/* 일정 리스트 */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>불러오는 중...</div>
        ) : events.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', paddingTop: 4 }}>
            오늘 일정이 없어요
          </div>
        ) : events.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 시간 박스 */}
            <div style={{
              padding: '4px 8px',
              borderRadius: 8,
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--ou-font-mono)',
              color: 'var(--ou-text-body)',
              flexShrink: 0,
              minWidth: 44,
              textAlign: 'center',
            }}>
              {e.domain_data.time || '종일'}
            </div>

            {/* 제목 + 장소 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 12, fontWeight: 500,
                color: 'var(--ou-text-strong)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {e.domain_data.title || e.raw?.slice(0, 20) || '일정'}
                {e.domain_data.location && (
                  <span style={{ color: 'var(--ou-text-dimmed)', fontWeight: 400 }}>
                    {' · '}{e.domain_data.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
