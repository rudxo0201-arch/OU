'use client';
import { DOMAINS } from '@/lib/ou-registry';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

// ── 무드 ──────────────────────────────────────────────────────────────────────
const MOOD_MAP: Record<string, { emoji: string; color: string; label: string }> = {
  '기쁨':  { emoji: '😊', color: 'rgba(255,220,100,0.25)', label: '기쁨' },
  '감사':  { emoji: '🙏', color: 'rgba(255,200,150,0.25)', label: '감사' },
  '평온':  { emoji: '😌', color: 'rgba(150,220,255,0.25)', label: '평온' },
  '슬픔':  { emoji: '😢', color: 'rgba(120,150,255,0.25)', label: '슬픔' },
  '분노':  { emoji: '😤', color: 'rgba(255,120,100,0.25)', label: '분노' },
  '불안':  { emoji: '😰', color: 'rgba(200,160,255,0.25)', label: '불안' },
  '외로움': { emoji: '🥺', color: 'rgba(180,180,220,0.25)', label: '외로움' },
  '우울':  { emoji: '😔', color: 'rgba(140,140,180,0.25)', label: '우울' },
  '힘듦':  { emoji: '😩', color: 'rgba(180,140,140,0.25)', label: '힘듦' },
  '설렘':  { emoji: '🥰', color: 'rgba(255,180,200,0.25)', label: '설렘' },
};
const DEFAULT_MOOD = { emoji: '📝', color: 'transparent', label: '' };
function getMoodInfo(mood?: string) { return mood ? (MOOD_MAP[mood] ?? DEFAULT_MOOD) : DEFAULT_MOOD; }

// ── 도메인 ────────────────────────────────────────────────────────────────────
const DOMAIN_ICONS: Record<string, string> = {
  schedule: '◫', task: '✓', habit: '⟳', journal: '✎', emotion: '💭',
};
const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', task: '할 일', habit: '습관', journal: '일기', emotion: '감정',
};
const TIMELINE_DOMAINS = new Set(['schedule', 'task', 'habit', 'emotion']);

// ── 시간 유틸 ─────────────────────────────────────────────────────────────────
function nodeTime(n: any): number {
  if (n.domain_data?.date) {
    const time = n.domain_data?.time || n.domain_data?.start_time || '00:00';
    return new Date(`${n.domain_data.date}T${time}`).getTime();
  }
  return new Date(n.created_at || 0).getTime();
}

const MATCH_MS = 30 * 60 * 1000; // 30분

function pickAnchor(jn: any, timelineNodes: any[]): any | null {
  const t = nodeTime(jn);
  let best: any = null;
  let bestDiff = Infinity;
  for (const tn of timelineNodes) {
    const diff = Math.abs(t - nodeTime(tn));
    if (diff < bestDiff && diff <= MATCH_MS) { best = tn; bestDiff = diff; }
  }
  return best;
}

// ── 카드 컴포넌트 ──────────────────────────────────────────────────────────────
function TimelineCard({ node }: { node: any }) {
  const domain = node.domain ?? 'note';
  const icon = domain === DOMAINS.EMOTION
    ? (getMoodInfo(node.domain_data?.mood).emoji)
    : (DOMAIN_ICONS[domain] ?? '•');
  const label = DOMAIN_LABELS[domain] ?? domain;
  const title = node.domain_data?.title ?? node.domain_data?.content ?? node.raw ?? '';
  const time = (() => {
    if (node.domain_data?.time || node.domain_data?.start_time) {
      return dayjs(`2000-01-01T${node.domain_data.time || node.domain_data.start_time}`).format('HH:mm');
    }
    return dayjs(node.created_at).format('HH:mm');
  })();

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', minWidth: 36, paddingTop: 2, fontFamily: 'var(--ou-font-mono)' }}>{time}</span>
      <span style={{ fontSize: 14, minWidth: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', marginBottom: 2 }}>{label}</div>
        <div style={{
          fontSize: 13, color: 'var(--ou-text-body)', lineHeight: 1.5,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
        }}>{title || '—'}</div>
      </div>
    </div>
  );
}

function JournalCard({ node, expanded, onToggle }: { node: any; expanded: boolean; onToggle: () => void }) {
  const mood = node.domain_data?.mood ?? node.domain_data?.emotion;
  const info = getMoodInfo(mood);
  const content = node.domain_data?.content ?? node.raw ?? '';
  const time = dayjs(node.created_at).format('HH:mm');

  return (
    <div
      onClick={onToggle}
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: info.color || 'rgba(0,0,0,0.03)',
        borderLeft: mood ? `3px solid ${info.color.replace('0.25', '0.6')}` : '3px solid var(--ou-border-faint)',
        cursor: 'pointer',
        transition: '120ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {mood && <span style={{ fontSize: 13 }}>{info.emoji}</span>}
        {mood && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ou-text-heading)' }}>{info.label}</span>}
        <span style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginLeft: 'auto' }}>{time}</span>
      </div>
      <div style={{
        fontSize: 13, color: 'var(--ou-text-body)', lineHeight: 1.6,
        overflow: expanded ? 'visible' : 'hidden',
        display: expanded ? 'block' : '-webkit-box',
        WebkitLineClamp: expanded ? undefined : 3,
        WebkitBoxOrient: 'vertical' as any,
        whiteSpace: expanded ? 'pre-wrap' : undefined,
      }}>{content}</div>
    </div>
  );
}

// ── 메인 뷰 ──────────────────────────────────────────────────────────────────
export function JournalView({ nodes }: ViewProps) {
  const today = dayjs().format('YYYY-MM-DD');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dayNodes, setDayNodes] = useState<any[]>([]);
  const [dayLoading, setDayLoading] = useState(true);

  // 날짜별 fetch
  const fetchDayNodes = useCallback(async (date: string) => {
    setDayLoading(true);
    try {
      const res = await fetch(`/api/nodes?date_from=${date}&date_to=${date}&limit=200`);
      const json = res.ok ? await res.json() : { nodes: [] };
      setDayNodes(Array.isArray(json.nodes) ? json.nodes : []);
    } catch {
      setDayNodes([]);
    } finally {
      setDayLoading(false);
    }
  }, []);

  useEffect(() => { fetchDayNodes(selectedDate); }, [selectedDate, fetchDayNodes]);

  useEffect(() => {
    const handler = () => fetchDayNodes(selectedDate);
    window.addEventListener('ou-node-created', handler);
    return () => window.removeEventListener('ou-node-created', handler);
  }, [selectedDate, fetchDayNodes]);

  // 그룹 분리
  const timelineNodes = useMemo(() =>
    [...dayNodes].filter(n => TIMELINE_DOMAINS.has(n.domain)).sort((a, b) => nodeTime(a) - nodeTime(b)),
    [dayNodes],
  );

  // journalNodes: dayNodes에서 나오면 교체, 아직 로딩 중이면 prop(OrbView prefetch)으로 표시
  const journalNodes = useMemo(() => {
    const base = dayNodes.length > 0
      ? dayNodes.filter(n => n.domain === DOMAINS.JOURNAL)
      : nodes.filter(n => n.domain === DOMAINS.JOURNAL || n.domain === DOMAINS.EMOTION || n.domain_data?.mood);
    return [...base].sort((a, b) => nodeTime(a) - nodeTime(b));
  }, [dayNodes, nodes]);

  // anchor 매칭
  const { anchorMap, unanchored } = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const tn of timelineNodes) map.set(tn.id, []);
    const unanchored: any[] = [];
    for (const jn of journalNodes) {
      const anchor = pickAnchor(jn, timelineNodes);
      if (anchor) map.get(anchor.id)!.push(jn);
      else unanchored.push(jn);
    }
    return { anchorMap: map, unanchored };
  }, [timelineNodes, journalNodes]);

  // 사이드바용 날짜 목록 (모든 nodes에서 추출)
  const allNodes = useMemo(() => [...nodes, ...dayNodes], [nodes, dayNodes]);
  const dateCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of allNodes) {
      const d = n.domain_data?.date ?? n.created_at?.slice(0, 10) ?? '';
      if (d) map.set(d, (map.get(d) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [allNodes]);

  const moodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of allNodes) {
      const m = n.domain_data?.mood ?? n.domain_data?.emotion;
      if (m) counts[m] = (counts[m] ?? 0) + 1;
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [allNodes]);

  const isToday = selectedDate === today;
  const dateLabel = isToday ? '오늘' : dayjs(selectedDate).format('M월 D일 (ddd)');

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* ── 좌측 사이드바 ── */}
      <div style={{
        width: 200, flexShrink: 0,
        background: 'var(--ou-glass)',
        borderRight: '1px solid var(--ou-glass-border)',
        overflowY: 'auto',
        padding: '20px 10px',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ou-text-muted)', padding: '0 8px', marginBottom: 8 }}>
          날짜
        </div>
        {dateCounts.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)', padding: '4px 8px' }}>기록 없음</div>
        )}
        {dateCounts.map(([date, count]) => {
          const isT = date === today;
          const label = isT ? '오늘' : dayjs(date).format('M/D (ddd)');
          return (
            <button key={date} onClick={() => setSelectedDate(date)} style={{
              textAlign: 'left', padding: '7px 10px', borderRadius: 7, border: 'none',
              background: selectedDate === date ? 'rgba(0,0,0,0.07)' : 'transparent',
              color: selectedDate === date ? 'var(--ou-text-heading)' : 'var(--ou-text-muted)',
              fontSize: 12, cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontWeight: selectedDate === date ? 600 : 400,
            }}>
              <span>{label}</span>
              <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', background: 'rgba(0,0,0,0.05)', borderRadius: 999, padding: '1px 5px' }}>{count}</span>
            </button>
          );
        })}

        {moodStats.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--ou-glass-border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ou-text-disabled)', padding: '0 8px', marginBottom: 8 }}>무드</div>
            {moodStats.slice(0, 5).map(([mood, count]) => {
              const info = getMoodInfo(mood);
              return (
                <div key={mood} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 7 }}>
                  <span style={{ fontSize: 13 }}>{info.emoji}</span>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--ou-text-body)' }}>{info.label || mood}</span>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 메인 영역: 타임라인 + 소회 ── */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 96 }}>

        {/* 날짜 헤더 */}
        <div style={{
          padding: '16px 24px 12px',
          borderBottom: '1px solid var(--ou-border-faint)',
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: 0,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-heading)' }}>
            {dateLabel}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ou-text-muted)', paddingLeft: 20 }}>
            소회
          </div>
        </div>

        {dayLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <span className="ou-spinner" style={{ width: 18, height: 18 }} />
          </div>
        )}

        {!dayLoading && timelineNodes.length === 0 && journalNodes.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>✎</div>
            아직 기록이 없습니다. 오늘 있었던 일을 적어보세요.
          </div>
        )}

        {/* 타임라인 rows */}
        {!dayLoading && timelineNodes.map(tn => (
          <div
            key={tn.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '300px 1fr',
              borderBottom: '1px solid var(--ou-border-faint)',
              minHeight: 60,
            }}
          >
            {/* 좌: 타임라인 카드 */}
            <div style={{ padding: '0 20px', borderRight: '1px solid var(--ou-border-faint)' }}>
              <TimelineCard node={tn} />
            </div>

            {/* 우: 매칭된 소회 카드들 */}
            <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(anchorMap.get(tn.id) ?? []).length === 0 ? (
                <div style={{ height: 44, display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: 1, background: 'var(--ou-border-faint)', borderStyle: 'dashed' }} />
                </div>
              ) : (anchorMap.get(tn.id) ?? []).map(jn => (
                <JournalCard
                  key={jn.id}
                  node={jn}
                  expanded={expandedId === jn.id}
                  onToggle={() => setExpandedId(expandedId === jn.id ? null : jn.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* journal만 있고 timeline 없는 경우 */}
        {!dayLoading && timelineNodes.length === 0 && journalNodes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', borderBottom: '1px solid var(--ou-border-faint)', minHeight: 60 }}>
            <div style={{ padding: '16px 20px', borderRight: '1px solid var(--ou-border-faint)', color: 'var(--ou-text-disabled)', fontSize: 12 }}>
              오늘 활동 기록 없음
            </div>
            <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unanchored.map(jn => (
                <JournalCard
                  key={jn.id}
                  node={jn}
                  expanded={expandedId === jn.id}
                  onToggle={() => setExpandedId(expandedId === jn.id ? null : jn.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 무관련 journal nodes (anchor 없음, timeline도 있었을 때) */}
        {!dayLoading && timelineNodes.length > 0 && unanchored.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 60 }}>
            <div style={{ padding: '16px 20px', borderRight: '1px solid var(--ou-border-faint)' }}>
              <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', paddingTop: 4 }}>— 기타</div>
            </div>
            <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unanchored.map(jn => (
                <JournalCard
                  key={jn.id}
                  node={jn}
                  expanded={expandedId === jn.id}
                  onToggle={() => setExpandedId(expandedId === jn.id ? null : jn.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
