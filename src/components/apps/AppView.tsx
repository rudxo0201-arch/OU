'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BaseAppLayout } from './BaseAppLayout';
import { AppInputBar } from './AppInputBar';
import { VIEW_REGISTRY } from '@/components/views/registry';
import { WidgetEmptyState } from '@/components/widgets/WidgetEmptyState';
import type { AppDef } from '@/lib/apps/registry';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

interface Props {
  appDef: AppDef;
  nodes: any[];
  activeView: string;
}

export function AppView({ appDef, nodes, activeView: initialView }: Props) {
  const router = useRouter();
  const [activeView, setActiveView] = useState(initialView);

  // 도메인별 필터 상태
  const [todoFilter, setTodoFilter] = useState<'today' | 'upcoming' | 'all' | 'done'>('upcoming');
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().format('YYYY-MM'));
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

  const allViews = [appDef.defaultView, ...appDef.alternateViews];

  function switchView(viewKey: string) {
    setActiveView(viewKey);
    router.replace(`/app/${appDef.slug}?view=${viewKey}`, { scroll: false });
  }

  // ── 도메인별 필터링 ──────────────────────────────────────────────────
  const filteredNodes = useMemo(() => {
    if (appDef.domain === 'task') {
      const today = dayjs().format('YYYY-MM-DD');
      return nodes.filter(n => {
        const done = n.domain_data?.status === 'done' || n.domain_data?.completed === true;
        const deadline = n.domain_data?.deadline ?? n.domain_data?.date ?? n.created_at;
        const dateStr = deadline ? dayjs(deadline).format('YYYY-MM-DD') : null;
        if (todoFilter === 'done') return done;
        if (todoFilter === 'today') return !done && dateStr === today;
        if (todoFilter === 'upcoming') return !done;
        return true; // all
      });
    }
    if (appDef.domain === 'finance') {
      return nodes.filter(n => {
        const d = n.domain_data?.date ?? n.created_at;
        return d && dayjs(d).format('YYYY-MM') === selectedMonth;
      });
    }
    if (appDef.domain === 'habit' && selectedHabit) {
      return nodes.filter(n => n.domain_data?.title === selectedHabit);
    }
    return nodes;
  }, [nodes, appDef.domain, todoFilter, selectedMonth, selectedHabit]);

  // ── 사이드바 ─────────────────────────────────────────────────────────
  const sidebar = buildSidebar({
    appDef, nodes, filteredNodes,
    todoFilter, setTodoFilter,
    selectedMonth, setSelectedMonth,
    selectedHabit, setSelectedHabit,
  });

  // ── 뷰 전환 탭 ───────────────────────────────────────────────────────
  const viewSwitcher = allViews.length > 1 ? (
    <div style={{ display: 'flex', gap: 2, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)', borderRadius: 8, padding: 3 }}>
      {allViews.map(v => (
        <button
          key={v}
          onClick={() => switchView(v)}
          style={{
            padding: '4px 12px', fontSize: 12, fontWeight: 500,
            border: 'none', borderRadius: 6, cursor: 'pointer',
            background: v === activeView ? 'var(--ou-bg)' : 'transparent',
            boxShadow: v === activeView ? 'var(--ou-neu-raised-sm)' : 'none',
            color: v === activeView ? 'var(--ou-text-strong)' : 'var(--ou-text-muted)',
            transition: 'all 150ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          {VIEW_LABELS[v] ?? v}
        </button>
      ))}
    </div>
  ) : null;

  const ViewComp = VIEW_REGISTRY[activeView];
  const showInputBar = appDef.inputType === 'record';

  return (
    <BaseAppLayout appLabel={appDef.label} sidebar={sidebar} headerRight={viewSwitcher}>
      {/* 뷰 콘텐츠 */}
      <div style={{ padding: '28px 32px', paddingBottom: showInputBar ? 8 : 28 }}>
        {filteredNodes.length === 0 ? (
          <EmptyState domain={appDef.domain} />
        ) : ViewComp ? (
          <ViewComp nodes={filteredNodes} />
        ) : (
          <div style={{ color: 'var(--ou-text-muted)', fontSize: 13 }}>
            뷰를 불러올 수 없습니다 ({activeView})
          </div>
        )}
      </div>

      {/* 기록형 AI 입력바 */}
      {showInputBar && (
        <AppInputBar
          domain={appDef.domain}
          placeholder={appDef.inputPlaceholder ?? '기록하기...'}
        />
      )}
    </BaseAppLayout>
  );
}

// ── 도메인별 사이드바 빌더 ──────────────────────────────────────────────

interface SidebarProps {
  appDef: AppDef;
  nodes: any[];
  filteredNodes: any[];
  todoFilter: string;
  setTodoFilter: (f: any) => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  selectedHabit: string | null;
  setSelectedHabit: (h: string | null) => void;
}

function buildSidebar(p: SidebarProps): React.ReactNode {
  switch (p.appDef.domain) {
    case 'schedule': return <CalendarSidebar nodes={p.nodes} />;
    case 'task':     return <TodoSidebar nodes={p.nodes} filter={p.todoFilter} setFilter={p.setTodoFilter} />;
    case 'finance':  return <FinanceSidebar nodes={p.nodes} selectedMonth={p.selectedMonth} setSelectedMonth={p.setSelectedMonth} />;
    case 'habit':    return <HabitSidebar nodes={p.nodes} selected={p.selectedHabit} setSelected={p.setSelectedHabit} />;
    default:         return <DefaultSidebar appDef={p.appDef} count={p.nodes.length} />;
  }
}

// ── Calendar Sidebar ──────────────────────────────────────────────────

function CalendarSidebar({ nodes }: { nodes: any[] }) {
  const today = dayjs();
  const upcoming = nodes
    .filter(n => n.domain_data?.date && dayjs(n.domain_data.date).isAfter(today.subtract(1, 'day')))
    .sort((a, b) => a.domain_data.date.localeCompare(b.domain_data.date))
    .slice(0, 8);

  const thisMonth = nodes.filter(n =>
    n.domain_data?.date && dayjs(n.domain_data.date).format('YYYY-MM') === today.format('YYYY-MM')
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <SidebarLabel>OU Calendar</SidebarLabel>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <StatBadge value={nodes.length} label="전체" />
        <StatBadge value={thisMonth} label="이번달" />
      </div>

      {/* Upcoming events */}
      <SidebarSection title="다가오는 일정">
        {upcoming.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', padding: '4px 0' }}>일정 없음</div>
        ) : upcoming.map(n => {
          const d = dayjs(n.domain_data.date);
          const isToday = d.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');
          return (
            <div key={n.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--ou-border-faint)' }}>
              <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 28 }}>
                <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', lineHeight: 1 }}>{d.format('M/D')}</div>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--ou-text-bright)' : 'var(--ou-text-muted)', lineHeight: 1.4 }}>{d.format('ddd')}</div>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.domain_data.title ?? '일정'}
                </div>
                {n.domain_data.time && (
                  <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginTop: 1 }}>{n.domain_data.time}</div>
                )}
              </div>
            </div>
          );
        })}
      </SidebarSection>
    </div>
  );
}

// ── Todo Sidebar ──────────────────────────────────────────────────────

const TODO_FILTERS = [
  { key: 'today',    label: '오늘' },
  { key: 'upcoming', label: '예정' },
  { key: 'all',      label: '전체' },
  { key: 'done',     label: '완료됨' },
] as const;

function TodoSidebar({ nodes, filter, setFilter }: {
  nodes: any[];
  filter: string;
  setFilter: (f: string) => void;
}) {
  const today = dayjs().format('YYYY-MM-DD');
  const counts = {
    today:    nodes.filter(n => {
      const done = n.domain_data?.status === 'done' || n.domain_data?.completed === true;
      const d = n.domain_data?.deadline ?? n.domain_data?.date ?? n.created_at;
      return !done && d && dayjs(d).format('YYYY-MM-DD') === today;
    }).length,
    upcoming: nodes.filter(n => !(n.domain_data?.status === 'done' || n.domain_data?.completed === true)).length,
    all:      nodes.length,
    done:     nodes.filter(n => n.domain_data?.status === 'done' || n.domain_data?.completed === true).length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <SidebarLabel>OU Todo</SidebarLabel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {TODO_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: filter === f.key ? 'var(--ou-bg)' : 'transparent',
              boxShadow: filter === f.key ? 'var(--ou-neu-pressed-sm)' : 'none',
              textAlign: 'left',
              transition: 'all 150ms ease',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: filter === f.key ? 600 : 400, color: filter === f.key ? 'var(--ou-text-strong)' : 'var(--ou-text-secondary)' }}>
              {f.label}
            </span>
            <span style={{
              fontSize: 11, fontFamily: 'var(--ou-font-mono)',
              color: filter === f.key ? 'var(--ou-text-body)' : 'var(--ou-text-disabled)',
              minWidth: 18, textAlign: 'right',
            }}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Finance Sidebar ───────────────────────────────────────────────────

function parseAmount(v: number | string | undefined): number {
  if (v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.]/g, '')) : v;
  return isNaN(n) ? 0 : n;
}

function FinanceSidebar({ nodes, selectedMonth, setSelectedMonth }: {
  nodes: any[];
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
}) {
  const d = dayjs(selectedMonth + '-01');

  function prevMonth() { setSelectedMonth(d.subtract(1, 'month').format('YYYY-MM')); }
  function nextMonth() { setSelectedMonth(d.add(1, 'month').format('YYYY-MM')); }

  const monthNodes = nodes.filter(n => {
    const date = n.domain_data?.date ?? n.created_at;
    return date && dayjs(date).format('YYYY-MM') === selectedMonth;
  });

  const total = monthNodes.reduce((s, n) => s + parseAmount(n.domain_data?.amount), 0);

  const catMap: Record<string, number> = {};
  for (const n of monthNodes) {
    const cat = n.domain_data?.category ?? '기타';
    catMap[cat] = (catMap[cat] ?? 0) + parseAmount(n.domain_data?.amount);
  }
  const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <SidebarLabel>OU Finance</SidebarLabel>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-strong)' }}>
          {d.format('YYYY년 M월')}
        </span>
        <button onClick={nextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* Total */}
      <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 10, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)' }}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: '0.08em', marginBottom: 4 }}>총 지출</div>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--ou-font-logo)', color: 'var(--ou-text-bright)', letterSpacing: '-0.02em' }}>
          ₩{total.toLocaleString('ko-KR')}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 3 }}>{monthNodes.length}건</div>
      </div>

      {/* Category breakdown */}
      {categories.length > 0 && (
        <SidebarSection title="카테고리">
          {categories.map(([cat, amt]) => {
            const pct = total > 0 ? (amt / total) * 100 : 0;
            return (
              <div key={cat} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: 'var(--ou-text-body)' }}>{cat}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)' }}>
                    {Math.round(pct)}%
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ou-text-secondary)', borderRadius: 2, transition: 'width 400ms ease' }} />
                </div>
              </div>
            );
          })}
        </SidebarSection>
      )}
    </div>
  );
}

// ── Habit Sidebar ─────────────────────────────────────────────────────

function calcStreak(dates: string[]): number {
  const set = new Set(dates);
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const iso = d.toISOString().slice(0, 10);
    if (!set.has(iso)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function HabitSidebar({ nodes, selected, setSelected }: {
  nodes: any[];
  selected: string | null;
  setSelected: (h: string | null) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  // 습관별 집계
  const habitMap: Record<string, string[]> = {};
  for (const n of nodes) {
    const title = n.domain_data?.title;
    if (!title) continue;
    if (!habitMap[title]) habitMap[title] = [];
    habitMap[title].push(n.created_at.slice(0, 10));
  }

  const habits = Object.entries(habitMap).map(([title, dates]) => ({
    title,
    doneToday: dates.includes(today),
    streak: calcStreak(dates),
    total: new Set(dates).size,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <SidebarLabel>OU Habit</SidebarLabel>

      {/* 전체 보기 */}
      <button
        onClick={() => setSelected(null)}
        style={{
          ...habitBtnBase,
          background: selected === null ? 'var(--ou-bg)' : 'transparent',
          boxShadow: selected === null ? 'var(--ou-neu-pressed-sm)' : 'none',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: selected === null ? 600 : 400, color: selected === null ? 'var(--ou-text-strong)' : 'var(--ou-text-secondary)' }}>
          전체 보기
        </span>
        <span style={{ fontSize: 11, color: 'var(--ou-text-disabled)', fontFamily: 'var(--ou-font-mono)' }}>{habits.length}</span>
      </button>

      <div style={{ height: 1, background: 'var(--ou-border-faint)', margin: '0 0 8px' }} />

      <SidebarSection title="습관 목록">
        {habits.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', padding: '4px 0' }}>기록된 습관 없음</div>
        ) : habits.map(h => (
          <button
            key={h.title}
            onClick={() => setSelected(h.title === selected ? null : h.title)}
            style={{
              ...habitBtnBase,
              background: h.title === selected ? 'var(--ou-bg)' : 'transparent',
              boxShadow: h.title === selected ? 'var(--ou-neu-pressed-sm)' : 'none',
              marginBottom: 4,
            }}
          >
            {/* Done indicator */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: h.doneToday ? 'var(--ou-text-body)' : 'var(--ou-border-subtle)',
            }} />
            <span style={{
              flex: 1, fontSize: 12, fontWeight: h.title === selected ? 600 : 400,
              color: h.title === selected ? 'var(--ou-text-strong)' : 'var(--ou-text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textAlign: 'left',
            }}>
              {h.title}
            </span>
            {h.streak > 0 && (
              <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', fontFamily: 'var(--ou-font-mono)', flexShrink: 0 }}>
                {h.streak}일
              </span>
            )}
          </button>
        ))}
      </SidebarSection>
    </div>
  );
}

// ── Default Sidebar ───────────────────────────────────────────────────

function DefaultSidebar({ appDef, count }: { appDef: AppDef; count: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <SidebarLabel>{appDef.label}</SidebarLabel>
      <StatBadge value={count} label="전체" />
    </div>
  );
}

// ── 공통 UI 헬퍼 ─────────────────────────────────────────────────────

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
      color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
      fontFamily: 'var(--ou-font-logo)', marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--ou-text-disabled)', textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatBadge({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', borderRadius: 8, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)' }}>
      <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--ou-font-logo)', color: 'var(--ou-text-bright)', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginTop: 3 }}>{label}</span>
    </div>
  );
}

function EmptyState({ domain }: { domain: string }) {
  const skeleton = DOMAIN_SKELETON[domain] ?? 'list';
  return (
    <div style={{ maxWidth: 340, margin: '80px auto' }}>
      <WidgetEmptyState skeleton={skeleton} cta="Q에서 기록하세요" />
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 18, color: 'var(--ou-text-muted)',
  padding: '2px 6px', borderRadius: 6,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1,
};

const habitBtnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
  width: '100%', transition: 'all 150ms ease',
};

const VIEW_LABELS: Record<string, string> = {
  calendar: '캘린더', timeline: '타임라인', table: '테이블',
  todo: '체크리스트', task: '칸반', chart: '차트',
  heatmap: '히트맵', journal: '저널', idea: '카드',
  profile: '프로필', map: '지도', scrap: '스크랩',
};

const DOMAIN_SKELETON: Record<string, 'finance' | 'schedule' | 'task' | 'habit' | 'idea' | 'list'> = {
  schedule: 'schedule', task: 'task', finance: 'finance',
  habit: 'habit', idea: 'idea',
  relation: 'list', location: 'list', health: 'list', media: 'list',
};
