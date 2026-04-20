'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VIEW_LABELS } from '@/components/views/registry';
import { NeuPageLayout } from '@/components/ds';
import {
  MagnifyingGlass, CheckSquare, CalendarBlank, Table, Book, Stack,
  ChartBar, GridFour, NotePencil, UserCircle, Lightbulb, ListBullets,
  VideoCamera, BookBookmark, YoutubeLogo, MapPin, Clock, Calendar,
  Sun, SunHorizon, CalendarDots, CreditCard, Wallet, ChartPieSlice,
  TrendUp, ArrowsLeftRight, Tag, Alarm, CheckCircle, WarningCircle,
  User, PersonSimpleRun, Fire, FileText, FilmStrip, Star, Code,
  Timer, Pill, Thermometer, Plant, TextAa, BookOpen, ClipboardText, Circle,
} from '@phosphor-icons/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PhosphorIcon = React.ComponentType<any>;

// ── 뷰 타입 → 도메인 매핑 ────────────────────────────────
const VIEW_TYPE_TO_DOMAIN: Record<string, string> = {
  // 풀뷰
  todo: 'task', calendar: 'schedule', table: 'knowledge', task: 'task',
  dictionary: 'knowledge', flashcard: 'education', timeline: 'schedule',
  chart: 'finance', heatmap: 'habit', journal: 'health', profile: 'relation',
  idea: 'idea', curriculum: 'education', lecture: 'education', boncho: 'health',
  scrap: 'knowledge', youtube: 'media', map: 'location',
  // 인라인 — 일정
  'schedule-time': 'schedule', 'schedule-date': 'schedule', 'schedule-range': 'schedule',
  'schedule-today': 'schedule', 'schedule-tomorrow': 'schedule',
  'schedule-week': 'schedule', 'schedule-around': 'schedule',
  // 인라인 — 가계부
  'finance-amount': 'finance', 'finance-balance': 'finance', 'finance-today': 'finance',
  'finance-week': 'finance', 'finance-compare': 'finance', 'finance-category': 'finance',
  // 인라인 — 할 일
  'task-check': 'task', 'task-deadline': 'task', 'task-today': 'task',
  'task-overdue': 'task', 'task-week': 'task', 'task-check-simple': 'task',
  // 인라인 — 기타
  'idea-card': 'idea', 'relation-card': 'relation', 'habit-log': 'habit',
  'habit-streak': 'habit', 'knowledge-note': 'knowledge', 'media-card': 'media',
  'media-rating': 'media', 'dev-note': 'development', 'location-pin': 'location',
  'youtube-card': 'media', 'youtube-timestamp': 'media', 'health-log': 'health',
  'health-symptom': 'health', 'health-med': 'health', 'boncho-herb': 'health',
  'dict-char': 'knowledge', 'edu-lesson': 'education', 'edu-assignment': 'education',
};

// ── 아이콘 맵 (Phosphor Icons only) ──────────────────────
const VIEW_ICONS: Record<string, PhosphorIcon> = {
  // 풀뷰
  todo: CheckSquare, calendar: CalendarBlank, table: Table, task: CheckSquare,
  dictionary: Book, flashcard: Stack, timeline: ArrowsLeftRight, chart: ChartBar,
  heatmap: GridFour, journal: NotePencil, profile: UserCircle, idea: Lightbulb,
  curriculum: ListBullets, lecture: VideoCamera, scrap: BookBookmark,
  youtube: YoutubeLogo, map: MapPin,
  // 인라인 — 일정
  'schedule-time': Clock, 'schedule-date': Calendar, 'schedule-range': CalendarBlank,
  'schedule-today': Sun, 'schedule-tomorrow': SunHorizon, 'schedule-week': CalendarDots,
  'schedule-around': CalendarDots,
  // 인라인 — 가계부
  'finance-amount': CreditCard, 'finance-balance': Wallet, 'finance-today': ChartPieSlice,
  'finance-week': TrendUp, 'finance-compare': ArrowsLeftRight, 'finance-category': Tag,
  // 인라인 — 할 일
  'task-check': CheckSquare, 'task-deadline': Alarm, 'task-today': CheckCircle,
  'task-overdue': WarningCircle, 'task-week': CalendarBlank, 'task-check-simple': CheckSquare,
  // 인라인 — 기타
  'idea-card': Lightbulb, 'relation-card': User, 'habit-log': PersonSimpleRun,
  'habit-streak': Fire, 'knowledge-note': FileText, 'media-card': FilmStrip,
  'media-rating': Star, 'dev-note': Code, 'location-pin': MapPin,
  'youtube-card': YoutubeLogo, 'youtube-timestamp': Timer,
  'health-log': Pill, 'health-symptom': Thermometer, 'health-med': Pill,
  'boncho-herb': Plant, 'dict-char': TextAa, 'edu-lesson': BookOpen,
  'edu-assignment': ClipboardText,
};

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '가계부', task: '할 일', idea: '아이디어',
  relation: '인물', habit: '습관', knowledge: '지식', media: '미디어',
  development: '개발', location: '장소', education: '교육', health: '건강',
};

const DOMAIN_ORDER = ['schedule', 'task', 'finance', 'habit', 'idea', 'relation', 'knowledge', 'location', 'media', 'education', 'development', 'health'];

// 피처드 뷰 키 (hero 섹션에 강조 표시)
const FEATURED_KEYS = ['location-map', 'schedule-month', 'task-kanban'];

type Tab = 'market' | 'my' | 'builtin';

interface ViewPreset {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  domain: string;
  category: string;
  view_type: string;
  when_to_use: string;
  is_default: boolean;
}

interface SavedView {
  id: string;
  name: string;
  view_type: string;
  icon?: string;
}

export default function OrbitPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('market');
  const [myViews, setMyViews] = useState<SavedView[]>([]);
  const [presets, setPresets] = useState<ViewPreset[]>([]);
  const [installedKeys, setInstalledKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/views').then(r => r.json()).catch(() => ({})),
      fetch('/api/views/presets').then(r => r.json()).catch(() => ({ presets: [] })),
    ]).then(([viewsData, presetsData]) => {
      const views: SavedView[] = viewsData.views || viewsData.data || [];
      const allPresets: ViewPreset[] = presetsData.presets || [];
      setMyViews(views);
      setPresets(allPresets);
      const installed = new Set<string>();
      allPresets.forEach(p => {
        if (views.some(v => v.view_type === p.view_type && v.name === p.name)) installed.add(p.key);
      });
      setInstalledKeys(installed);
      setLoading(false);
    });
  }, []);

  const install = useCallback(async (presetKey: string) => {
    setInstalling(presetKey);
    try {
      const res = await fetch('/api/orbit/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetKey }),
      });
      const data = await res.json();
      if (data.viewId) {
        setInstalledKeys(prev => new Set(prev).add(presetKey));
        fetch('/api/views').then(r => r.json()).then(d => setMyViews(d.views || d.data || []));
      }
    } finally {
      setInstalling(null);
    }
  }, []);

  const BUILTIN_VIEWS = Object.entries(VIEW_LABELS).map(([key, label]) => ({
    id: `builtin-${key}`, viewType: key, name: label,
    domain: VIEW_TYPE_TO_DOMAIN[key] || 'knowledge',
  }));

  // 검색 + 도메인 필터 (마켓: BUILTIN_VIEWS 기반)
  const filteredBuiltin = BUILTIN_VIEWS.filter(v => {
    const matchDomain = selectedDomain === 'all' || v.domain === selectedDomain;
    if (!searchQuery) return matchDomain;
    const q = searchQuery.toLowerCase();
    return matchDomain && (v.name.toLowerCase().includes(q) || DOMAIN_LABELS[v.domain]?.includes(q));
  });

  // presets API 보조 필터 (API 데이터 있을 때만)
  const filteredPresets = presets.filter(p => {
    const matchDomain = selectedDomain === 'all' || p.domain === selectedDomain;
    if (!searchQuery) return matchDomain;
    const q = searchQuery.toLowerCase();
    return matchDomain && (
      p.name.includes(q) || p.description?.includes(q) ||
      p.when_to_use.includes(q) || DOMAIN_LABELS[p.domain]?.includes(q)
    );
  });

  const featuredPresets = presets.filter(p => FEATURED_KEYS.includes(p.key));

  const builtinByDomain = DOMAIN_ORDER.reduce((acc, domain) => {
    const items = filteredBuiltin.filter(v => v.domain === domain);
    if (items.length > 0) acc[domain] = items;
    return acc;
  }, {} as Record<string, typeof BUILTIN_VIEWS>);

  const presetsByDomain = DOMAIN_ORDER.reduce((acc, domain) => {
    const items = filteredPresets.filter(p => p.domain === domain);
    if (items.length > 0) acc[domain] = items;
    return acc;
  }, {} as Record<string, ViewPreset[]>);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'market', label: '마켓' },
    { key: 'my', label: '내 뷰' },
    { key: 'builtin', label: '기본 내장' },
  ];

  const domains = ['all', ...DOMAIN_ORDER.filter(d => BUILTIN_VIEWS.some(v => v.domain === d))];

  return (
    <NeuPageLayout onBack={() => router.back()}>
      <div style={{ paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 12, color: 'var(--ou-text-dimmed)',
            fontFamily: 'var(--ou-font-logo)', letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Orbit
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 700, color: 'var(--ou-text-bright)',
            margin: '0 0 4px', letterSpacing: '-0.02em',
          }}>
            뷰 마켓플레이스
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ou-text-body)', margin: 0 }}>
            데이터를 꺼내 쓰는 렌더 방식을 골라 설치하세요.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 18px', borderRadius: 999, border: 'none',
              fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t.key ? 600 : 500,
              cursor: 'pointer', background: 'var(--ou-bg)',
              boxShadow: tab === t.key ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-xs)',
              color: tab === t.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
              transition: 'box-shadow 150ms',
            }}>
              {t.label}
              {t.key === 'my' && myViews.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.6 }}>{myViews.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── 마켓 탭 ── */}
        {tab === 'market' && (
          <>
            {/* 검색 */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <MagnifyingGlass
                size={14}
                style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--ou-text-muted)', pointerEvents: 'none',
                }}
              />
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedDomain('all'); }}
                placeholder="뷰 검색 (예: 일정, 지출, 캘린더)"
                style={{
                  width: '100%', padding: '10px 16px 10px 36px',
                  borderRadius: 12, border: 'none',
                  fontFamily: 'inherit', fontSize: 13,
                  background: 'var(--ou-bg)',
                  boxShadow: 'var(--ou-neu-pressed-sm)',
                  color: 'var(--ou-text-strong)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 도메인 필터 chips */}
            <div style={{
              display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 28,
              paddingBottom: 4,
              msOverflowStyle: 'none', scrollbarWidth: 'none',
            }}>
              {domains.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDomain(d)}
                  style={{
                    flexShrink: 0,
                    padding: '6px 14px', borderRadius: 999, border: 'none',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: selectedDomain === d ? 600 : 400,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    background: 'var(--ou-bg)',
                    boxShadow: selectedDomain === d ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-xs)',
                    color: selectedDomain === d ? 'var(--ou-text-bright)' : 'var(--ou-text-muted)',
                    transition: 'all 150ms',
                  }}
                >
                  {d === 'all' ? '전체' : DOMAIN_LABELS[d] || d}
                </button>
              ))}
            </div>

            {filteredBuiltin.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 14, color: 'var(--ou-text-muted)' }}>검색 결과가 없어요.</div>
              </div>
            ) : searchQuery || selectedDomain !== 'all' ? (
              /* 필터/검색 결과 — 그리드 */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
                gap: 14,
              }}>
                {filteredBuiltin.map(v => (
                  <ViewCard
                    key={v.id}
                    view={v}
                    onOpen={() => {
                      const existing = myViews.find(mv => mv.view_type === v.viewType);
                      if (existing) router.push(`/view/${existing.id}`);
                      else router.push(`/view/builtin-${v.viewType}`);
                    }}
                  />
                ))}
              </div>
            ) : (
              /* 기본 화면 — 도메인별 섹션 */
              <>
                {featuredPresets.length > 0 && (
                  <div style={{ marginBottom: 40 }}>
                    <SectionHeader title="추천 뷰" />
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: 16,
                    }}>
                      {featuredPresets.map(p => (
                        <FeaturedCard
                          key={p.key}
                          preset={p}
                          installed={installedKeys.has(p.key)}
                          installing={installing === p.key}
                          onInstall={() => install(p.key)}
                          onOpen={() => router.push(`/view/builtin-${p.view_type}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {Object.entries(builtinByDomain).map(([domain, items]) => (
                  <BuiltinDomainSection
                    key={domain}
                    domain={domain}
                    items={items}
                    onOpen={(viewType) => {
                      const existing = myViews.find(mv => mv.view_type === viewType);
                      if (existing) router.push(`/view/${existing.id}`);
                      else router.push(`/view/builtin-${viewType}`);
                    }}
                    onShowAll={() => setSelectedDomain(domain)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* ── 내 뷰 탭 ── */}
        {tab === 'my' && (
          loading ? (
            <div style={{ fontSize: 13, color: 'var(--ou-text-muted)', padding: '20px 0' }}>불러오는 중...</div>
          ) : myViews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.2 }}>◉</div>
              <div style={{ fontSize: 14, color: 'var(--ou-text-muted)' }}>아직 설치한 뷰가 없어요</div>
              <div style={{ fontSize: 12, color: 'var(--ou-text-dimmed)', marginTop: 4 }}>마켓에서 뷰를 설치해보세요</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 188px))',
              justifyContent: 'center', gap: 16,
            }}>
              {myViews.map(v => (
                <ViewCard
                  key={v.id}
                  view={{ id: v.id, name: v.name, viewType: v.view_type }}
                  onOpen={() => router.push(`/view/${v.id}`)}
                />
              ))}
            </div>
          )
        )}

        {/* ── 기본 내장 탭 ── */}
        {tab === 'builtin' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 188px))',
            justifyContent: 'center', gap: 16,
          }}>
            {BUILTIN_VIEWS.map(v => (
              <ViewCard
                key={v.id}
                view={v}
                onOpen={() => {
                  const existing = myViews.find(mv => mv.view_type === v.viewType);
                  if (existing) router.push(`/view/${existing.id}`);
                  else router.push(`/view/builtin-${v.viewType}`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </NeuPageLayout>
  );
}

// ── 섹션 헤더 ─────────────────────────────────────────────
function SectionHeader({ title, onShowAll }: { title: string; onShowAll?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ou-text-bright)', letterSpacing: '-0.01em' }}>
        {title}
      </span>
      {onShowAll && (
        <button
          onClick={onShowAll}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--ou-text-muted)', fontFamily: 'inherit',
          }}
        >
          모두 보기
        </button>
      )}
    </div>
  );
}

// ── 빌트인 도메인 섹션 (가로 스크롤) ────────────────────────
function BuiltinDomainSection({ domain, items, onOpen, onShowAll }: {
  domain: string;
  items: { id: string; viewType: string; name: string; domain: string }[];
  onOpen: (viewType: string) => void;
  onShowAll: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeader title={DOMAIN_LABELS[domain] || domain} onShowAll={items.length > 4 ? onShowAll : undefined} />
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 14, overflowX: 'auto',
          paddingBottom: 8,
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}
      >
        {items.map(v => (
          <div key={v.id} style={{ flexShrink: 0, width: 168 }}>
            <ViewCard view={v} onOpen={() => onOpen(v.viewType)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 도메인 섹션 (가로 스크롤) ─────────────────────────────
function DomainSection({ domain, items, installedKeys, installing, onInstall, onOpen, onShowAll }: {
  domain: string;
  items: ViewPreset[];
  installedKeys: Set<string>;
  installing: string | null;
  onInstall: (key: string) => void;
  onOpen: (viewType: string) => void;
  onShowAll: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeader title={DOMAIN_LABELS[domain] || domain} onShowAll={items.length > 3 ? onShowAll : undefined} />
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 14, overflowX: 'auto',
          paddingBottom: 8,
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}
      >
        {items.map(p => (
          <div key={p.key} style={{ flexShrink: 0, width: 180 }}>
            <PresetCard
              preset={p}
              installed={installedKeys.has(p.key)}
              installing={installing === p.key}
              onInstall={() => onInstall(p.key)}
              onOpen={() => onOpen(p.view_type)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 피처드 카드 (hero) ────────────────────────────────────
function FeaturedCard({ preset, installed, installing, onInstall, onOpen }: {
  preset: ViewPreset;
  installed: boolean;
  installing: boolean;
  onInstall: () => void;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const IconComp = VIEW_ICONS[preset.view_type] || Circle;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20,
        background: 'var(--ou-bg)',
        boxShadow: hovered ? 'var(--ou-neu-raised-lg)' : 'var(--ou-neu-raised-md)',
        overflow: 'hidden',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        cursor: 'pointer',
      }}
      onClick={onOpen}
    >
      {/* Preview 영역 */}
      <div style={{
        height: 160, background: 'var(--ou-bg)',
        boxShadow: 'inset 4px 4px 10px rgba(163,177,198,0.4), inset -4px -4px 10px rgba(255,255,255,0.7)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, position: 'relative',
        color: 'var(--ou-text-body)',
      }}>
        <IconComp size={52} weight="light" />
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ou-text-dimmed)', fontFamily: 'var(--ou-font-logo)',
        }}>
          {DOMAIN_LABELS[preset.domain] || preset.domain}
        </div>
      </div>

      {/* 정보 영역 */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ou-text-bright)', marginBottom: 4 }}>
          {preset.name}
        </div>
        {preset.description && (
          <div style={{
            fontSize: 12, color: 'var(--ou-text-muted)', lineHeight: 1.5,
            marginBottom: 14, display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {preset.description}
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); if (!installed && !installing) onInstall(); }}
          disabled={installed || installing}
          style={{
            padding: '8px 20px', borderRadius: 999, border: 'none',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            cursor: installed || installing ? 'default' : 'pointer',
            background: 'var(--ou-bg)',
            boxShadow: installed ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
            color: installed ? 'var(--ou-text-dimmed)' : 'var(--ou-text-strong)',
            transition: 'all 150ms',
          }}
        >
          {installing ? '...' : installed ? '설치됨' : '설치'}
        </button>
      </div>
    </div>
  );
}

// ── 일반 프리셋 카드 ──────────────────────────────────────
function PresetCard({ preset, installed, installing, onInstall, onOpen }: {
  preset: ViewPreset;
  installed: boolean;
  installing: boolean;
  onInstall: () => void;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const IconComp = VIEW_ICONS[preset.view_type] || Circle;
  const categoryLabel = preset.category === 'inline' ? '인라인' : preset.category === 'cross' ? '복합' : '풀뷰';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, overflow: 'hidden',
        background: 'var(--ou-bg)',
        boxShadow: hovered ? 'var(--ou-neu-raised-md)' : 'var(--ou-neu-raised-sm)',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        cursor: 'pointer',
      }}
      onClick={onOpen}
    >
      {/* Preview */}
      <div style={{
        height: 100,
        background: 'var(--ou-bg)',
        boxShadow: 'inset 3px 3px 8px rgba(163,177,198,0.35), inset -3px -3px 8px rgba(255,255,255,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ou-text-body)',
      }}>
        <IconComp size={36} weight="light" />
      </div>

      {/* 정보 */}
      <div style={{ padding: '12px 12px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ou-text-strong)', marginBottom: 4, lineHeight: 1.3 }}>
          {preset.name}
        </div>
        {preset.description && (
          <div style={{
            fontSize: 11, color: 'var(--ou-text-dimmed)', lineHeight: 1.4, marginBottom: 10,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {preset.description}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {categoryLabel}
          </span>
          <button
            onClick={e => { e.stopPropagation(); if (!installed && !installing) onInstall(); }}
            disabled={installed || installing}
            style={{
              padding: '5px 12px', borderRadius: 999, border: 'none',
              fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
              cursor: installed || installing ? 'default' : 'pointer',
              background: 'var(--ou-bg)',
              boxShadow: installed ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-xs)',
              color: installed ? 'var(--ou-text-disabled)' : 'var(--ou-text-strong)',
              transition: 'all 150ms', whiteSpace: 'nowrap',
            }}
          >
            {installing ? '...' : installed ? '설치됨' : '설치'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 기존 뷰 카드 (내 뷰 / 기본 내장 탭) ──────────────────
function ViewCard({ view, onOpen }: {
  view: { id: string; name: string; viewType?: string };
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const IconComp = (view.viewType && VIEW_ICONS[view.viewType]) || Circle;
  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        padding: '28px 20px 24px', background: 'var(--ou-bg)',
        boxShadow: hovered ? 'var(--ou-neu-raised-lg)' : 'var(--ou-neu-raised-sm)',
        borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        width: '100%',
      }}
    >
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ou-text-body)',
      }}>
        <IconComp size={28} weight="light" />
      </div>
      <span style={{
        fontSize: 13, color: 'var(--ou-text-strong)', textAlign: 'center', lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap', fontWeight: 500,
      }}>
        {view.name}
      </span>
    </button>
  );
}
