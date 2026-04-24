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

function getTodayKST() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function getDateLabel() {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', day: '2-digit' });
  const month = now.toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', month: 'short' }).toUpperCase();
  const weekday = now.toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', weekday: 'short' }).toUpperCase();
  return { day, month, weekday };
}

export function TodayScheduleWidget() {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(rootRef);
  const [events, setEvents] = useState<ScheduleNode[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchEvents = useCallback(() => {
    const today = getTodayKST();
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

  const { day, month, weekday } = getDateLabel();
  const maxEvents = size === 'sm' ? 1 : size === 'md' ? 3 : 5;
  const pad = size === 'sm' ? '10px 12px' : size === 'md' ? '14px 16px' : '16px 20px';

  return (
    <div ref={rootRef} style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: pad,
      overflow: 'hidden',
    }}>
      {/* sm: 날짜 숫자 + 첫 이벤트 */}
      {size === 'sm' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
            <span style={{
              fontSize: 32,
              fontFamily: 'var(--ou-font-display)',
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: 'var(--ou-text-heading)',
            }}>
              {day}
            </span>
          </div>
          {loading ? null : events.length === 0 ? (
            <button
              onClick={() => router.push('/orb/calendar')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: 11, color: 'var(--ou-text-muted)' }}
            >
              일정 없음
            </button>
          ) : (
            <EventRow e={events[0]} size="sm" />
          )}
        </>
      ) : (
        <>
          {/* md / lg: 날짜 hero 블록 */}
          <div style={{ marginBottom: 12, flexShrink: 0 }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ou-text-muted)',
              marginBottom: 2,
            }}>
              {month} · {weekday}
            </div>
            <div style={{
              fontSize: 'var(--ou-text-display)',
              fontFamily: 'var(--ou-font-display)',
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: 'var(--ou-text-heading)',
            }}>
              {day}
            </div>
          </div>

          {/* hairline */}
          <div style={{ height: 1, background: 'var(--ou-hairline)', marginBottom: 10, flexShrink: 0 }} />

          {/* 이벤트 목록 */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>…</div>
            ) : events.length === 0 ? (
              <button
                onClick={() => router.push('/orb/calendar')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', padding: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ou-text-secondary)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.5,
                }}
              >
                오늘 일정이 없어요 →
              </button>
            ) : (
              events.slice(0, maxEvents).map((e, i) => (
                <div key={e.id}>
                  {i > 0 && (
                    <div style={{ height: 1, background: 'var(--ou-hairline)' }} />
                  )}
                  <EventRow e={e} size={size} />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EventRow({ e, size }: { e: ScheduleNode; size: 'sm' | 'md' | 'lg' }) {
  const timeStr = e.domain_data.time ? e.domain_data.time.slice(0, 5) : '종일';
  const titleStr = e.domain_data.title || e.raw?.slice(0, 24) || '일정';
  const isLg = size === 'lg';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: size === 'sm' ? 8 : 10,
      padding: size === 'sm' ? '0' : '8px 0',
    }}>
      <span style={{
        fontSize: size === 'sm' ? 10 : 11,
        fontFamily: 'var(--ou-font-mono)',
        fontWeight: 500,
        color: 'var(--ou-text-muted)',
        letterSpacing: '0.02em',
        flexShrink: 0,
        minWidth: size === 'sm' ? 28 : 36,
        paddingTop: 1,
      }}>
        {timeStr}
      </span>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          fontSize: size === 'sm' ? 11 : 12,
          fontWeight: 500,
          color: 'var(--ou-text-strong)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}>
          {titleStr}
        </div>
        {isLg && e.domain_data.location && (
          <div style={{
            fontSize: 10,
            color: 'var(--ou-text-muted)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {e.domain_data.location}
          </div>
        )}
      </div>
    </div>
  );
}
