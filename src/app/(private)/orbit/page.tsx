'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VIEW_LABELS } from '@/components/views/registry';
import { NeuPageLayout } from '@/components/ds';

// ── 아이콘 맵 ────────────────────────────────────────────
const VIEW_ICONS: Record<string, string> = {
  todo: '☑', calendar: '▥', table: '▦', task: '▦', dictionary: '本',
  flashcard: '卡', timeline: '─', chart: '₩', heatmap: '▣',
  journal: '◐', profile: '◎', idea: '◈', curriculum: '≡',
  lecture: '▶', scrap: '◉', youtube: '▶', map: '📍',
  'schedule-time': '🕐', 'schedule-date': '📅', 'schedule-range': '📆',
  'schedule-today': '☀️', 'schedule-tomorrow': '🌅', 'schedule-week': '📋',
  'schedule-around': '🗓', 'finance-amount': '💳', 'finance-balance': '💰',
  'finance-today': '📊', 'finance-week': '📈', 'finance-compare': '↔',
  'finance-category': '🏷', 'task-check': '☐', 'task-deadline': '⏰',
  'task-today': '✅', 'task-overdue': '🚨', 'task-week': '📅',
  'idea-card': '💡', 'relation-card': '👤', 'habit-log': '🏃',
  'habit-streak': '🔥', 'knowledge-note': '📄', 'media-card': '🎬',
  'media-rating': '⭐', 'dev-note': '💻', 'location-pin': '📍',
  'youtube-card': '▶', 'youtube-timestamp': '⏱', 'health-log': '💊',
  'health-symptom': '🤒', 'health-med': '💊', 'boncho-herb': '🌿',
  'dict-char': '字', 'edu-lesson': '📚', 'edu-assignment': '📝',
};

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '가계부', task: '할 일', idea: '아이디어',
  relation: '인물', habit: '습관', knowledge: '지식', media: '미디어',
  development: '개발', location: '장소', education: '교육', health: '건강',
};

type Tab = 'my' | 'builtin' | 'market';
type SortKey = 'domain' | 'category' | 'all';

interface ViewPreset {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  domain: string;
  category: string; // inline | full | cross
  view_type: string;
  when_to_use: string;
  is_default: boolean;
}

interface SavedView {
  id: string;
  name: string;
  view_type: string;
  icon?: string;
  description?: string;
}

export default function OrbitPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('market');
  const [sortKey, setSortKey] = useState<SortKey>('domain');
  const [myViews, setMyViews] = useState<SavedView[]>([]);
  const [presets, setPresets] = useState<ViewPreset[]>([]);
  const [installedKeys, setInstalledKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 내 뷰 + 프리셋 로드
  useEffect(() => {
    Promise.all([
      fetch('/api/views').then(r => r.json()).catch(() => ({})),
      fetch('/api/views/presets').then(r => r.json()).catch(() => ({ presets: [] })),
    ]).then(([viewsData, presetsData]) => {
      const views: SavedView[] = viewsData.views || viewsData.data || [];
      const allPresets: ViewPreset[] = presetsData.presets || [];
      setMyViews(views);
      setPresets(allPresets);

      // 설치된 view_type 추적 (이름+뷰타입으로 매칭)
      const installed = new Set<string>();
      allPresets.forEach(p => {
        if (views.some(v => v.view_type === p.view_type && v.name === p.name)) {
          installed.add(p.key);
        }
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
        // 내 뷰 목록 새로고침
        fetch('/api/views').then(r => r.json()).then(d => setMyViews(d.views || d.data || []));
      }
    } finally {
      setInstalling(null);
    }
  }, []);

  const BUILTIN_VIEWS = Object.entries(VIEW_LABELS).map(([key, label]) => ({
    id: `builtin-${key}`, viewType: key, name: label, icon: VIEW_ICONS[key] || '◉',
  }));

  // 마켓 필터링
  const filteredPresets = presets.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.includes(q) || p.description?.includes(q) || p.when_to_use.includes(q) || DOMAIN_LABELS[p.domain]?.includes(q);
  });

  // 도메인별 그룹핑
  const presetsByDomain = filteredPresets.reduce((acc, p) => {
    const key = p.domain;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, ViewPreset[]>);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'market', label: '마켓' },
    { key: 'my', label: '내 뷰' },
    { key: 'builtin', label: '기본 내장' },
  ];

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
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
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
            <div style={{ marginBottom: 20 }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="뷰 검색 (예: 일정, 지출, 캘린더)"
                style={{
                  width: '100%', padding: '10px 16px', borderRadius: 12, border: 'none',
                  fontFamily: 'inherit', fontSize: 13,
                  background: 'var(--ou-bg)',
                  boxShadow: 'var(--ou-neu-pressed-sm)',
                  color: 'var(--ou-text-strong)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--ou-text-muted)', padding: '20px 0' }}>불러오는 중...</div>
            ) : filteredPresets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 14, color: 'var(--ou-text-muted)' }}>검색 결과가 없어요.</div>
              </div>
            ) : (
              Object.entries(presetsByDomain).map(([domain, domainPresets]) => (
                <div key={domain} style={{ marginBottom: 32 }}>
                  {/* 도메인 헤더 */}
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--ou-text-dimmed)', marginBottom: 12,
                  }}>
                    {DOMAIN_LABELS[domain] || domain}
                  </div>

                  {/* 프리셋 그리드 */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 12,
                  }}>
                    {domainPresets.map(preset => (
                      <PresetCard
                        key={preset.key}
                        preset={preset}
                        installed={installedKeys.has(preset.key)}
                        installing={installing === preset.key}
                        onInstall={() => install(preset.key)}
                      />
                    ))}
                  </div>
                </div>
              ))
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 160px))',
              justifyContent: 'center',
              gap: 16,
            }}>
              {myViews.map(v => (
                <ViewCard
                  key={v.id}
                  view={{ id: v.id, name: v.name, icon: VIEW_ICONS[v.view_type] || v.icon || '◉', viewType: v.view_type }}
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 160px))',
            justifyContent: 'center',
            gap: 16,
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

// ── 마켓 프리셋 카드 ──────────────────────────────────────
function PresetCard({ preset, installed, installing, onInstall }: {
  preset: ViewPreset;
  installed: boolean;
  installing: boolean;
  onInstall: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const icon = VIEW_ICONS[preset.view_type] || preset.icon || '◉';
  const categoryLabel = preset.category === 'inline' ? '인라인' : preset.category === 'cross' ? '복합' : '풀뷰';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '18px 16px 14px',
        background: 'var(--ou-bg)',
        boxShadow: hovered ? 'var(--ou-neu-raised-lg)' : 'var(--ou-neu-raised-sm)',
        borderRadius: 16,
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        cursor: 'default',
      }}
    >
      {/* 아이콘 */}
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-pressed-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, marginBottom: 10,
      }}>
        {icon}
      </div>

      {/* 이름 */}
      <div style={{
        fontSize: 13, fontWeight: 600, color: 'var(--ou-text-strong)',
        marginBottom: 4, lineHeight: 1.3,
      }}>
        {preset.name}
      </div>

      {/* 설명 */}
      {preset.description && (
        <div style={{
          fontSize: 11, color: 'var(--ou-text-dimmed)', lineHeight: 1.4,
          marginBottom: 10, flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden',
        }}>
          {preset.description}
        </div>
      )}

      {/* 카테고리 뱃지 */}
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
        color: 'var(--ou-text-dimmed)', marginBottom: 10,
        textTransform: 'uppercase',
      }}>
        {categoryLabel}
      </div>

      {/* 설치 버튼 */}
      <button
        onClick={onInstall}
        disabled={installed || installing}
        style={{
          width: '100%', padding: '7px 0', borderRadius: 8, border: 'none',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
          cursor: installed || installing ? 'default' : 'pointer',
          background: 'var(--ou-bg)',
          boxShadow: installed
            ? 'var(--ou-neu-pressed-sm)'
            : 'var(--ou-neu-raised-xs)',
          color: installed ? 'var(--ou-text-dimmed)' : 'var(--ou-text-strong)',
          transition: 'all 150ms',
        }}
      >
        {installing ? '설치 중...' : installed ? '설치됨' : '설치'}
      </button>
    </div>
  );
}

// ── 기존 뷰 카드 (내 뷰 / 기본 내장 탭) ──────────────────
function ViewCard({ view, onOpen }: {
  view: { id: string; name: string; icon: string; viewType?: string };
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 12,
        padding: '24px 16px 20px',
        background: 'var(--ou-bg)',
        boxShadow: hovered ? 'var(--ou-neu-raised-lg)' : 'var(--ou-neu-raised-sm)',
        borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, color: 'var(--ou-text-body)',
      }}>
        {view.icon}
      </div>
      <span style={{
        fontSize: 13, color: 'var(--ou-text-strong)',
        textAlign: 'center', lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis',
        width: '100%', whiteSpace: 'nowrap', fontWeight: 500,
      }}>
        {view.name}
      </span>
    </button>
  );
}
