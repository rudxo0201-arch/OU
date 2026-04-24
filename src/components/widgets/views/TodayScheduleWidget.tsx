'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useWidgetSize } from './useWidgetSize';

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
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(rootRef);
  const [events, setEvents] = useState<ScheduleNode[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchEvents = useCallback(() => {
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
    fetch('/api/nodes?domain=schedule&limit=50')
      .then(r => r.json())
      .then(d => {
        const nodes: ScheduleNode[] = d.nodes || [];
        const todayEvents = nodes
          .filter(n => {
            const date = n.domain_data?.date;
            if (!date) return false;
            const s = String(date).trim().toLowerCase();
            if (s === 'today' || s === '오늘') return true;
            return s === today;
          })
          .sort((a, b) => (a.domain_data.time || '').localeCompare(b.domain_data.time || ''));
        setEvents(todayEvents);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('widget-schedule')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_nodes', filter: 'domain=eq.schedule' }, fetchEvents)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchEvents]);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.domain === 'schedule') fetchEvents();
    };
    window.addEventListener('ou-node-created', handler);
    return () => window.removeEventListener('ou-node-created', handler);
  }, [fetchEvents]);

  const pad = size === 'sm' ? '8px 10px' : size === 'md' ? '12px 14px' : '14px 18px';
  const titleSize = size === 'sm' ? 11 : size === 'md' ? 12 : 13;
  const timeSize  = size === 'sm' ? 10 : 11;
  const gap       = size === 'sm' ? 5 : 8;

  return (
    <div ref={rootRef} style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: pad,
    }}>
      {size !== 'sm' && (
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: 'var(--ou-text-dimmed)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: size === 'lg' ? 14 : 10, flexShrink: 0,
        }}>
          오늘 일정
        </span>
      )}

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>…</div>
        ) : events.length === 0 ? (
          <button
            onClick={() => router.push('/orb/calendar')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', padding: 0,
              fontSize: 11, color: 'var(--ou-text-muted)',
              lineHeight: 1.6,
            }}
          >
            {size === 'sm' ? '일정 없음' : '오늘 일정이 없어요 →'}
          </button>
        ) : events.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? 6 : 10 }}>
            {/* 시간 */}
            <div style={{
              padding: size === 'sm' ? '3px 5px' : '4px 8px',
              borderRadius: 6,
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
              fontSize: timeSize, fontWeight: 600,
              fontFamily: 'var(--ou-font-mono)',
              color: 'var(--ou-text-body)',
              flexShrink: 0,
              minWidth: size === 'sm' ? 32 : 44,
              textAlign: 'center',
            }}>
              {e.domain_data.time ? e.domain_data.time.slice(0, 5) : '종일'}
            </div>

            {/* 제목 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: titleSize, fontWeight: 500,
                color: 'var(--ou-text-strong)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {e.domain_data.title || e.raw?.slice(0, 20) || '일정'}
              </div>
              {size === 'lg' && e.domain_data.location && (
                <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 1 }}>
                  ◎ {e.domain_data.location}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
