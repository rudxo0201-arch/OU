'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PageLayout } from '@/components/ds';
import { QSBar } from '@/components/home/QSBar';
import { OrbGrid } from '@/components/home/OrbGrid';
import { DockBar } from '@/components/home/DockBar';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import styles from './home.module.css';

/* ── 전체 도메인 설정 맵 ── */
const DOMAIN_CONFIG = {
  schedule: { label: '일정',    icon: '◫', orbSlug: 'calendar',  viewType: 'schedule-today', desc: '약속, 일정, 날짜' },
  task:     { label: '할 일',   icon: '✓', orbSlug: 'task',      viewType: 'task-today',     desc: '해야 할 것, 마감' },
  finance:  { label: '지출',    icon: '◈', orbSlug: 'finance',   viewType: 'finance-today',  desc: '돈, 수입, 지출' },
  habit:    { label: '습관',    icon: '⟳', orbSlug: 'habit',     viewType: 'habit-log',      desc: '루틴, 운동, 반복' },
  note:     { label: '노트',    icon: '✎', orbSlug: 'note',      viewType: 'note-list',      desc: '메모, 글쓰기' },
  idea:     { label: '아이디어', icon: '✦', orbSlug: 'idea',      viewType: 'idea-list',      desc: '기획, 구상' },
  knowledge:{ label: '지식',    icon: '◉', orbSlug: 'knowledge', viewType: 'flashcard',      desc: '학습, 정보' },
  media:    { label: '미디어',  icon: '▶', orbSlug: 'youtube',   viewType: 'youtube',        desc: '영상, 음악, 책' },
} as const;

type DomainKey = keyof typeof DOMAIN_CONFIG;

/* ── localStorage 기반 위젯 도메인 훅 ── */
function useWidgetDomain(widgetId: string, defaultDomain: DomainKey) {
  const [domain, setDomainState] = useState<DomainKey>(defaultDomain);

  useEffect(() => {
    const stored = localStorage.getItem(`widget_domain_${widgetId}`);
    if (stored && stored in DOMAIN_CONFIG) setDomainState(stored as DomainKey);
  }, [widgetId]);

  const setDomain = useCallback((d: DomainKey) => {
    setDomainState(d);
    localStorage.setItem(`widget_domain_${widgetId}`, d);
  }, [widgetId]);

  return [domain, setDomain] as const;
}

/* ── 날짜 헬퍼 ── */
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function getToday() {
  const d = new Date();
  return {
    day: d.getDate(), month: MONTH_EN[d.getMonth()],
    weekday: WEEKDAY_EN[d.getDay()], weekdayKo: WEEKDAY_KO[d.getDay()],
    year: d.getFullYear(),
  };
}

/* ══════════════════════════════════════════════════════
   도메인 선택 드롭다운
══════════════════════════════════════════════════════ */
function DomainPicker({
  current, onSelect, onClose, anchorEl,
}: {
  current: DomainKey;
  onSelect: (d: DomainKey) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          anchorEl && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorEl]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        zIndex: 300,
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,0,0,0.09)',
        borderTop: 'none',
        borderRadius: '0 0 14px 14px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
        padding: '12px 14px 14px',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.30)',
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        데이터 소스 선택
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {(Object.entries(DOMAIN_CONFIG) as [DomainKey, typeof DOMAIN_CONFIG[DomainKey]][]).map(([key, cfg]) => {
          const isActive = key === current;
          return (
            <button
              key={key}
              onClick={() => { onSelect(key); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 10px', borderRadius: 8,
                border: `1px solid ${isActive ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.07)'}`,
                background: isActive ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.02)',
                color: isActive ? 'white' : 'rgba(0,0,0,0.65)',
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 100ms ease',
              }}
            >
              <span style={{ fontSize: 14, opacity: isActive ? 1 : 0.7 }}>{cfg.icon}</span>
              <span>
                <div style={{ fontWeight: isActive ? 600 : 500, lineHeight: 1.2 }}>{cfg.label}</div>
                <div style={{ fontSize: 10, opacity: 0.55, marginTop: 1 }}>{cfg.desc}</div>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   공통: 위젯 카드 래퍼
══════════════════════════════════════════════════════ */
function WidgetCard({
  icon, label, meta, orbSlug, children,
  domain, configOpen, onConfigOpen, onConfigClose, onDomainSelect,
}: {
  icon: string;
  label: string;
  meta?: string;
  orbSlug: string;
  children: React.ReactNode;
  domain?: DomainKey;
  configOpen?: boolean;
  onConfigOpen?: () => void;
  onConfigClose?: () => void;
  onDomainSelect?: (d: DomainKey) => void;
}) {
  const router = useRouter();
  const [headerHovered, setHeaderHovered] = useState(false);
  const configBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className={styles.widgetCard}
      style={{ position: 'relative', overflow: configOpen ? 'visible' : 'hidden' }}
      onClick={() => !configOpen && router.push(`/orb/${orbSlug}`)}
    >
      {/* ── 헤더 ── */}
      <div
        className={styles.widgetHeader}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
      >
        <span className={styles.widgetIconBox}>{icon}</span>
        <span className={styles.widgetTitle}>{label}</span>

        {/* 현재 도메인 뱃지 */}
        {domain && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.36)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            background: 'rgba(0,0,0,0.05)', padding: '2px 7px',
            borderRadius: 4, flexShrink: 0,
            transition: 'opacity 120ms ease',
          }}>
            {DOMAIN_CONFIG[domain].label}
          </span>
        )}

        {meta && <span className={styles.widgetMeta}>{meta}</span>}

        {/* ⚙ 설정 버튼 (헤더 호버 시 노출) */}
        {onConfigOpen && (
          <button
            ref={configBtnRef}
            onClick={e => { e.stopPropagation(); configOpen ? onConfigClose?.() : onConfigOpen(); }}
            title="데이터 소스 변경"
            style={{
              width: 24, height: 24, borderRadius: 6, border: 'none',
              background: configOpen ? 'rgba(0,0,0,0.10)' : 'transparent',
              color: configOpen ? 'rgba(0,0,0,0.70)' : 'rgba(0,0,0,0.28)',
              cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 100ms ease',
              opacity: headerHovered || configOpen ? 1 : 0,
            }}
          >
            ⚙
          </button>
        )}

        <span className={styles.widgetArrow}>›</span>
      </div>

      {/* ── 도메인 선택 드롭다운 ── */}
      {configOpen && domain && onDomainSelect && onConfigClose && (
        <DomainPicker
          current={domain}
          onSelect={onDomainSelect}
          onClose={onConfigClose}
          anchorEl={configBtnRef.current}
        />
      )}

      {children}
    </div>
  );
}

/* ── 구분선 / 마이크로라벨 ── */
function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'rgba(0,0,0,0.26)', marginBottom: 4,
    }}>
      {children}
    </div>
  );
}
function Divider() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '0 -16px' }} />;
}

/* ── 공통: 일반 데이터 목록 (도메인이 바뀌었을 때) ── */
function GenericNodeList({ nodes, loading, domain }: { nodes: any[]; loading: boolean; domain: DomainKey }) {
  const cfg = DOMAIN_CONFIG[domain];
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 16px 14px' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ height: 32, borderRadius: 6, background: 'rgba(0,0,0,0.04)', opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    );
  }
  if (nodes.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16,
      }}>
        <span style={{ fontSize: 20, opacity: 0.15 }}>{cfg.icon}</span>
        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)' }}>
          {cfg.label} 데이터가 없습니다
        </span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 16px 12px', gap: 0, overflow: 'hidden' }}>
      {nodes.slice(0, 6).map((node, i) => (
        <div key={node.id ?? i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 34, borderBottom: '1px solid rgba(0,0,0,0.04)',
        }}>
          <span style={{ fontSize: 11, opacity: 0.40, flexShrink: 0 }}>{cfg.icon}</span>
          <span style={{
            fontSize: 12, color: 'rgba(0,0,0,0.65)',
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {node.domain_data?.title ?? node.title ?? node.raw?.slice(0, 60) ?? '(제목 없음)'}
          </span>
          {node.created_at && (
            <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.22)', flexShrink: 0 }}>
              {new Date(node.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── 공통: 노드 fetch 훅 (Realtime 구독 포함) ── */
function useNodes(domain: DomainKey, limit: number) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNodes = useCallback(() => {
    setLoading(true);
    return fetch(`/api/nodes?domain=${domain}&limit=${limit}`)
      .then(r => r.ok ? r.json() : { nodes: [] })
      .then(j => setNodes(Array.isArray(j.nodes) ? j.nodes : []))
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, [domain, limit]);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`home-widget-${domain}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'data_nodes', filter: `domain=eq.${domain}` },
        () => { fetchNodes(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [domain, fetchNodes]);

  return { nodes, loading };
}

/* ══════════════════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════════════════ */
export default function HomePage() {
  const today = getToday();

  return (
    <PageLayout>
      <div className={styles.homeRoot}>
        <div className={styles.grid}>
          <div className={styles.cellQS}><QSBar /></div>

          <div className={styles.cellOrbs}>
            <OrbGrid />
            <span className={styles.orbRowDate}>
              {today.weekday} · {today.month} {today.day}
            </span>
          </div>

          <div className={styles.cellCalendar}><CalendarWidget today={today} /></div>
          <div className={styles.cellTask}><TaskWidget /></div>
          <div className={styles.cellFinance}><FinanceWidget /></div>
          <div className={styles.cellHabit}><HabitWidget /></div>
          <div className={styles.cellNote}><NoteWidget /></div>
          <div className={styles.cellIdea}><IdeaWidget /></div>
        </div>
      </div>
      <DockBar />
    </PageLayout>
  );
}

/* ══════════════════════════════════════════════════════
   CALENDAR WIDGET
══════════════════════════════════════════════════════ */
function CalendarWidget({ today }: { today: ReturnType<typeof getToday> }) {
  const [domain, setDomain] = useWidgetDomain('calendar', 'schedule');
  const [configOpen, setConfigOpen] = useState(false);
  const { nodes, loading } = useNodes(domain, 10);

  const cfg = DOMAIN_CONFIG[domain];
  const isNative = domain === 'schedule';
  const TIME_SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];

  return (
    <WidgetCard
      icon={cfg.icon} label={isNative ? '오늘 일정' : cfg.label} orbSlug={cfg.orbSlug}
      domain={domain} configOpen={configOpen}
      onConfigOpen={() => setConfigOpen(true)}
      onConfigClose={() => setConfigOpen(false)}
      onDomainSelect={setDomain}
    >
      <div className={styles.widgetBody}>
        {isNative ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <span style={{
                fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
                color: 'rgba(0,0,0,0.88)', fontVariantNumeric: 'tabular-nums',
              }}>{today.day}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.60)', letterSpacing: '-0.01em' }}>
                  {today.month} {today.year}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.04em' }}>
                  {today.weekday} · {today.weekdayKo}요일
                </span>
              </div>
            </div>
            <Divider />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {loading ? (
                [0,1,2].map(i => <div key={i} style={{ height: 36, borderRadius: 8, background: 'rgba(0,0,0,0.04)', animation: 'ou-shimmer 1.5s ease infinite' }} />)
              ) : nodes.length > 0 ? (
                <ViewRenderer viewType="schedule-today" nodes={nodes} inline />
              ) : (
                TIME_SLOTS.map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', height: 36, gap: 12, padding: '0 4px', borderRadius: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.25)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--ou-font-mono)', flexShrink: 0, width: 36 }}>{t}</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)', borderRadius: 1 }} />
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <GenericNodeList nodes={nodes} loading={loading} domain={domain} />
        )}
      </div>
    </WidgetCard>
  );
}

/* ══════════════════════════════════════════════════════
   TASK WIDGET
══════════════════════════════════════════════════════ */
function TaskWidget() {
  const [domain, setDomain] = useWidgetDomain('task', 'task');
  const [configOpen, setConfigOpen] = useState(false);
  const { nodes, loading } = useNodes(domain, 10);

  const cfg = DOMAIN_CONFIG[domain];
  const isNative = domain === 'task';
  const PLACEHOLDER = ['오늘 할 일을 추가해보세요', '입력창에 말하면 바로 기록됩니다', '완료하면 체크해보세요'];

  return (
    <WidgetCard
      icon={cfg.icon} label={isNative ? '할 일' : cfg.label}
      meta={nodes.length > 0 ? `0 / ${nodes.length}` : undefined}
      orbSlug={cfg.orbSlug}
      domain={domain} configOpen={configOpen}
      onConfigOpen={() => setConfigOpen(true)}
      onConfigClose={() => setConfigOpen(false)}
      onDomainSelect={setDomain}
    >
      {isNative ? (
        <div className={styles.widgetBody} style={{ paddingTop: 10 }}>
          <MicroLabel>TODAY</MicroLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading ? (
              [0,1,2].map(i => <div key={i} style={{ height: 36, borderRadius: 8, background: 'rgba(0,0,0,0.04)' }} />)
            ) : nodes.length > 0 ? (
              <ViewRenderer viewType="task-today" nodes={nodes} inline />
            ) : (
              PLACEHOLDER.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', height: 36, gap: 10, padding: '0 2px', borderRadius: 8, opacity: 1 - i * 0.25 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 5, border: '1.5px solid rgba(0,0,0,0.16)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: i === 0 ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.14)', letterSpacing: '-0.01em' }}>{t}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <GenericNodeList nodes={nodes} loading={loading} domain={domain} />
      )}
    </WidgetCard>
  );
}

/* ══════════════════════════════════════════════════════
   FINANCE WIDGET
══════════════════════════════════════════════════════ */
function FinanceWidget() {
  const [domain, setDomain] = useWidgetDomain('finance', 'finance');
  const [configOpen, setConfigOpen] = useState(false);
  const { nodes, loading } = useNodes(domain, 10);

  const cfg = DOMAIN_CONFIG[domain];
  const isNative = domain === 'finance';
  const CATEGORIES = ['식비', '교통', '기타'];

  return (
    <WidgetCard
      icon={cfg.icon} label={isNative ? '지출' : cfg.label} orbSlug={cfg.orbSlug}
      domain={domain} configOpen={configOpen}
      onConfigOpen={() => setConfigOpen(true)}
      onConfigClose={() => setConfigOpen(false)}
      onDomainSelect={setDomain}
    >
      {isNative ? (
        <div className={styles.widgetBody} style={{ paddingTop: 10 }}>
          <MicroLabel>TODAY</MicroLabel>
          {loading ? (
            <div style={{ height: 44, borderRadius: 8, background: 'rgba(0,0,0,0.04)', marginBottom: 12 }} />
          ) : nodes.length > 0 ? (
            <ViewRenderer viewType="finance-today" nodes={nodes} inline />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.36)', letterSpacing: '0.02em' }}>₩</span>
                <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'rgba(0,0,0,0.88)', fontVariantNumeric: 'tabular-nums' }}>0</span>
              </div>
              <Divider />
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {CATEGORIES.map(cat => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.42)' }}>{cat}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,0.36)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--ou-font-mono)' }}>₩0</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <GenericNodeList nodes={nodes} loading={loading} domain={domain} />
      )}
    </WidgetCard>
  );
}

/* ══════════════════════════════════════════════════════
   HABIT WIDGET
══════════════════════════════════════════════════════ */
function HabitWidget() {
  const [domain, setDomain] = useWidgetDomain('habit', 'habit');
  const [configOpen, setConfigOpen] = useState(false);
  const { nodes, loading } = useNodes(domain, 7);

  const cfg = DOMAIN_CONFIG[domain];
  const isNative = domain === 'habit';
  const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <WidgetCard
      icon={cfg.icon} label={isNative ? '습관' : cfg.label} orbSlug={cfg.orbSlug}
      domain={domain} configOpen={configOpen}
      onConfigOpen={() => setConfigOpen(true)}
      onConfigClose={() => setConfigOpen(false)}
      onDomainSelect={setDomain}
    >
      {isNative ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
          {loading ? (
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.06)' }} />
          ) : nodes.length > 0 ? (
            <ViewRenderer viewType="habit-log" nodes={nodes} inline />
          ) : (
            DAYS.map((d, i) => {
              const isToday = i === todayIdx;
              return (
                <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <div style={{ width: '100%', maxWidth: 32, height: 32, borderRadius: 8, background: isToday ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms ease' }}>
                    {isToday && <div style={{ width: 6, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.7)' }} />}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 500, color: isToday ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.22)', letterSpacing: '0.02em' }}>{d}</span>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <GenericNodeList nodes={nodes} loading={loading} domain={domain} />
      )}
    </WidgetCard>
  );
}

/* ══════════════════════════════════════════════════════
   NOTE WIDGET
══════════════════════════════════════════════════════ */
function NoteWidget() {
  const [domain, setDomain] = useWidgetDomain('note', 'note');
  const [configOpen, setConfigOpen] = useState(false);
  const { nodes, loading } = useNodes(domain, 6);

  const cfg = DOMAIN_CONFIG[domain];

  return (
    <WidgetCard
      icon={cfg.icon} label={domain === 'note' ? '최근 노트' : cfg.label}
      meta={nodes.length > 0 ? `${nodes.length}` : undefined}
      orbSlug={cfg.orbSlug}
      domain={domain} configOpen={configOpen}
      onConfigOpen={() => setConfigOpen(true)}
      onConfigClose={() => setConfigOpen(false)}
      onDomainSelect={setDomain}
    >
      <div className={styles.widgetBody} style={{ paddingTop: 10 }}>
        <MicroLabel>RECENT</MicroLabel>
        <LineItemList nodes={nodes} loading={loading} emptyMsg={`${cfg.label} 데이터가 없습니다`} />
      </div>
    </WidgetCard>
  );
}

/* ══════════════════════════════════════════════════════
   IDEA WIDGET
══════════════════════════════════════════════════════ */
function IdeaWidget() {
  const [domain, setDomain] = useWidgetDomain('idea', 'idea');
  const [configOpen, setConfigOpen] = useState(false);
  const { nodes, loading } = useNodes(domain, 6);

  const cfg = DOMAIN_CONFIG[domain];

  return (
    <WidgetCard
      icon={cfg.icon} label={domain === 'idea' ? '아이디어' : cfg.label}
      meta={nodes.length > 0 ? `${nodes.length}` : undefined}
      orbSlug={cfg.orbSlug}
      domain={domain} configOpen={configOpen}
      onConfigOpen={() => setConfigOpen(true)}
      onConfigClose={() => setConfigOpen(false)}
      onDomainSelect={setDomain}
    >
      <div className={styles.widgetBody} style={{ paddingTop: 10 }}>
        <MicroLabel>RECENT</MicroLabel>
        <LineItemList nodes={nodes} loading={loading} emptyMsg={`${cfg.label} 데이터가 없습니다`} />
      </div>
    </WidgetCard>
  );
}

/* ── 공통: LineItem 목록 ── */
function LineItemList({ nodes, loading, emptyMsg }: { nodes: any[]; loading: boolean; emptyMsg: string }) {
  const N = 5;
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: N }).map((_, i) => (
          <div key={i} style={{ height: 36, borderRadius: 6, background: 'rgba(0,0,0,0.04)', opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    );
  }
  if (nodes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: N }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', height: 36, gap: 10, borderBottom: '1px solid rgba(0,0,0,0.04)', opacity: 1 - i * 0.18 }}>
            <div style={{ width: `${45 + i * 8}%`, height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.07)' }} />
          </div>
        ))}
        <div style={{ paddingTop: 10, fontSize: 11, color: 'rgba(0,0,0,0.22)', letterSpacing: '0.01em' }}>{emptyMsg}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {nodes.slice(0, N).map((node, i) => (
        <div key={node.id ?? i} style={{ display: 'flex', alignItems: 'center', height: 36, gap: 10, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.68)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {node.domain_data?.title ?? node.title ?? node.raw?.slice(0, 60) ?? '제목 없음'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.22)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {node.created_at ? new Date(node.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
