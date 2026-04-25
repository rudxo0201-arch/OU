'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, PencilSimple, Trash } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { useWidgetSize } from './useWidgetSize';

interface ScheduleDomainData {
  date?: string;
  time?: string;
  end_time?: string;
  title?: string;
  location?: string;
  category?: string;
  [key: string]: unknown;
}

interface ScheduleNode {
  id: string;
  domain_data: ScheduleDomainData;
  raw?: string;
}

function getTodayKST() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function normDate(d?: string): string {
  if (!d) return getTodayKST();
  const s = d.trim().toLowerCase();
  if (s === 'today' || s === '오늘') return getTodayKST();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : getTodayKST();
}

function getDateLabel() {
  const now = new Date();
  const day     = now.toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', day: '2-digit' });
  const month   = now.toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', month: 'short' }).toUpperCase();
  const weekday = now.toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', weekday: 'short' }).toUpperCase();
  return { day, month, weekday };
}

// ── 공통 스타일 ───────────────────────────────────────────────────────────
const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid var(--ou-hairline-strong)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--ou-text-heading)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const LABEL: React.CSSProperties = {
  fontSize: 9,
  fontFamily: 'var(--ou-font-mono)',
  fontWeight: 700,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  color: 'var(--ou-text-muted)',
  marginBottom: 4,
  display: 'block',
};

// ── EditModal ─────────────────────────────────────────────────────────────
interface EditForm {
  title: string;
  date: string;
  time: string;
  end_time: string;
  location: string;
}

function EditModal({ event, onClose, onSaved }: {
  event: ScheduleNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditForm>({
    title:    event.domain_data.title    || '',
    date:     normDate(event.domain_data.date),
    time:     (event.domain_data.time    || '').slice(0, 5),
    end_time: (event.domain_data.end_time || '').slice(0, 5),
    location: event.domain_data.location || '',
  });
  const [saving, setSaving]         = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const set = (k: keyof EditForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/nodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: event.id,
          domain_data: {
            ...event.domain_data,
            title:    form.title    || event.domain_data.title,
            date:     form.date     || event.domain_data.date,
            time:     form.time     || undefined,
            end_time: form.end_time || undefined,
            location: form.location || undefined,
          },
        }),
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error('[EditModal] save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    await fetch(`/api/quick?nodeId=${event.id}`, { method: 'DELETE' });
    onSaved();
    onClose();
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.22)' }} />
      <div
        onClick={ev => ev.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          background: 'var(--ou-space)',
          border: '1px solid var(--ou-hairline-strong)',
          borderRadius: 12,
          padding: '24px',
          width: 340,
          boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ou-text-heading)', letterSpacing: '-0.02em' }}>
            일정 편집
          </span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ou-text-muted)', padding: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* 필드 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LABEL}>제목</label>
            <input
              style={INPUT}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="일정 제목"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && save()}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={LABEL}>날짜</label>
              <input style={INPUT} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>시간</label>
              <input style={INPUT} type="time" value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={LABEL}>종료 시간</label>
              <input style={INPUT} type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>장소</label>
              <input style={INPUT} value={form.location} onChange={e => set('location', e.target.value)} placeholder="선택" />
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
          <button
            onClick={del}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              color: confirmDel ? '#c0392b' : 'var(--ou-text-muted)',
              fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
              transition: 'color 150ms',
            }}
          >
            <Trash size={13} />
            {confirmDel ? '정말요?' : '삭제'}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 14px',
                border: '1px solid var(--ou-hairline-strong)',
                borderRadius: 6, background: 'transparent', cursor: 'pointer',
                fontSize: 12, color: 'var(--ou-text-muted)',
              }}
            >
              취소
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: '7px 16px',
                border: 'none', borderRadius: 6,
                background: 'var(--ou-text-heading)',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 12, color: 'var(--ou-space)', fontWeight: 600,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '저장중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── EventRow ──────────────────────────────────────────────────────────────
function EventRow({ e, size, onEdit }: {
  e: ScheduleNode;
  size: 'sm' | 'md' | 'lg';
  onEdit: (e: ScheduleNode) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const timeStr  = e.domain_data.time ? (e.domain_data.time as string).slice(0, 5) : '종일';
  const titleStr = e.domain_data.title || e.raw?.slice(0, 24) || '일정';
  const isLg = size === 'lg';

  return (
    <div
      onClick={ev => { ev.stopPropagation(); onEdit(e); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: size === 'sm' ? 8 : 10,
        padding: size === 'sm' ? '4px 6px' : '8px 6px',
        margin: '0 -6px',
        borderRadius: 6,
        cursor: 'pointer',
        background: hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
        transition: 'background 150ms',
      }}
    >
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
            {e.domain_data.location as string}
          </div>
        )}
      </div>

      {hovered && size !== 'sm' && (
        <PencilSimple size={12} style={{ color: 'var(--ou-text-muted)', flexShrink: 0, marginTop: 2 }} />
      )}
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────
export function TodayScheduleWidget() {
  const rootRef = useRef<HTMLDivElement>(null);
  const size    = useWidgetSize(rootRef);
  const [events, setEvents]   = useState<ScheduleNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ScheduleNode | null>(null);
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
          .sort((a, b) => ((a.domain_data.time as string) || '').localeCompare((b.domain_data.time as string) || ''));
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
    <>
      <div
        ref={rootRef}
        onClick={() => router.push('/orb/calendar')}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: pad,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {size === 'sm' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <span style={{
                fontSize: 32, fontFamily: 'var(--ou-font-display)', fontWeight: 600,
                lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--ou-text-heading)',
              }}>
                {day}
              </span>
            </div>
            {loading ? null : events.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>일정 없음</div>
            ) : (
              <EventRow e={events[0]} size="sm" onEdit={setEditing} />
            )}
          </>
        ) : (
          <>
            <div style={{ marginBottom: 12, flexShrink: 0 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--ou-text-muted)', marginBottom: 2,
              }}>
                {month} · {weekday}
              </div>
              <div style={{
                fontSize: 'var(--ou-text-display)', fontFamily: 'var(--ou-font-display)',
                fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--ou-text-heading)',
              }}>
                {day}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--ou-hairline)', marginBottom: 10, flexShrink: 0 }} />

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>…</div>
              ) : events.length === 0 ? (
                <div style={{
                  fontSize: 13, fontWeight: 500, color: 'var(--ou-text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5,
                }}>
                  오늘 일정이 없어요 →
                </div>
              ) : (
                events.slice(0, maxEvents).map((e, i) => (
                  <div key={e.id}>
                    {i > 0 && <div style={{ height: 1, background: 'var(--ou-hairline)' }} />}
                    <EventRow e={e} size={size} onEdit={setEditing} />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {editing && (
        <EditModal event={editing} onClose={() => setEditing(null)} onSaved={fetchEvents} />
      )}
    </>
  );
}
