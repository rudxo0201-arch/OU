'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VIEW_LABELS } from '@/components/views/registry';
import { NeuPageLayout } from '@/components/ds';

const VIEW_ICONS: Record<string, string> = {
  todo: '☑', calendar: '▥', table: '▦', task: '▦', dictionary: '本',
  flashcard: '卡', timeline: '─', chart: '₩', heatmap: '▣',
  journal: '◐', profile: '◎', idea: '◈', curriculum: '≡',
  lecture: '▶', scrap: '◉', youtube: '▶', map: '◈',
};

const BUILTIN_VIEWS = Object.entries(VIEW_LABELS).map(([key, label]) => ({
  id: `builtin-${key}`,
  viewType: key,
  name: label,
  icon: VIEW_ICONS[key] || '◉',
}));

type Tab = 'my' | 'builtin' | 'market';

export default function OrbitPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('builtin');
  const [myViews, setMyViews] = useState<{ id: string; name: string; view_type: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/views')
      .then(r => r.json())
      .then(data => { setMyViews(data.views || data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openView = (viewId: string) => router.push(`/view/${viewId}`);
  const openBuiltin = (viewType: string) => {
    const existing = myViews.find(v => v.view_type === viewType);
    if (existing) router.push(`/view/${existing.id}`);
    else router.push(`/view/builtin-${viewType}`);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'my', label: '내 뷰' },
    { key: 'builtin', label: '기본 내장' },
    { key: 'market', label: '마켓' },
  ];

  return (
    <NeuPageLayout onBack={() => router.push('/my')}>
      <div style={{ paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 13, color: 'var(--ou-text-dimmed)',
            fontFamily: 'var(--ou-font-logo)', letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Orbit
          </div>
          <h1 style={{
            fontSize: 32, fontWeight: 700, color: 'var(--ou-text-bright)',
            margin: '0 0 4px', letterSpacing: '-0.02em',
          }}>
            뷰 마켓플레이스
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ou-text-body)', margin: 0 }}>
            DataNode를 꺼내 쓰는 렌더 방식을 골라 설치하세요.
          </p>
        </div>

        {/* Tab chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 18px', borderRadius: 999, border: 'none',
                fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t.key ? 600 : 500,
                cursor: 'pointer',
                background: 'var(--ou-bg)',
                boxShadow: tab === t.key ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-xs)',
                color: tab === t.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'my' && (
          loading ? (
            <div style={{ fontSize: 13, color: 'var(--ou-text-muted)', padding: '20px 0' }}>불러오는 중...</div>
          ) : myViews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.2, fontFamily: 'var(--ou-font-logo)' }}>◉</div>
              <div style={{ fontSize: 14, color: 'var(--ou-text-muted)' }}>아직 저장한 뷰가 없어요</div>
              <div style={{ fontSize: 12, color: 'var(--ou-text-dimmed)', marginTop: 4 }}>기본 내장 탭에서 뷰를 추가해보세요</div>
            </div>
          ) : (
            <ViewGrid
              views={myViews.map(v => ({ id: v.id, name: v.name, icon: VIEW_ICONS[v.view_type] || '◉', viewType: v.view_type }))}
              onOpen={openView}
            />
          )
        )}

        {tab === 'builtin' && (
          <ViewGrid views={BUILTIN_VIEWS} onOpen={(_, viewType) => openBuiltin(viewType!)} />
        )}

        {tab === 'market' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.2, fontFamily: 'var(--ou-font-logo)' }}>🪐</div>
            <div style={{ fontSize: 14, color: 'var(--ou-text-muted)' }}>Orbit 마켓 준비 중</div>
            <div style={{ fontSize: 12, color: 'var(--ou-text-dimmed)', marginTop: 4 }}>
              다른 사용자가 만든 뷰를 구매하고 내 데이터에 적용할 수 있어요
            </div>
          </div>
        )}
      </div>
    </NeuPageLayout>
  );
}

function ViewGrid({ views, onOpen }: {
  views: { id: string; name: string; icon: string; viewType?: string }[];
  onOpen: (id: string, viewType?: string) => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: 18,
    }}>
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onOpen(view.id, view.viewType)}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 10,
            padding: '20px 10px 18px',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-raised-xs)',
            borderRadius: 16,
            border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-pressed-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'var(--ou-text-body)',
          }}>
            {view.icon}
          </div>
          <span style={{
            fontSize: 12, color: 'var(--ou-text-strong)',
            textAlign: 'center', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis',
            width: '100%', whiteSpace: 'nowrap', fontWeight: 500,
          }}>
            {view.name}
          </span>
        </button>
      ))}
    </div>
  );
}
