'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VIEW_LABELS } from '@/components/views/registry';
import { NeuPageLayout, NeuTabs, NeuCard } from '@/components/ds';

const VIEW_ICONS: Record<string, string> = {
  todo: '☑', calendar: '📅', table: '📊', task: '📋', dictionary: '📖',
  flashcard: '🃏', timeline: '⏳', chart: '📈', heatmap: '🟩',
  journal: '📓', profile: '👤', idea: '💡', curriculum: '📚',
  lecture: '🎓', scrap: '📌',
};

// 기본 내장 뷰 (OU가 제공하는 "앱")
const BUILTIN_VIEWS = Object.entries(VIEW_LABELS).map(([key, label]) => ({
  id: `builtin-${key}`,
  viewType: key,
  name: label,
  icon: VIEW_ICONS[key] || '◉',
  builtin: true,
}));

type Tab = 'my' | 'builtin' | 'market';

export default function OrbitPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('my');
  const [myViews, setMyViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/views')
      .then(r => r.json())
      .then(data => {
        setMyViews(data.views || data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openView = (viewId: string) => {
    router.push(`/view/${viewId}`);
  };

  const openBuiltin = (viewType: string) => {
    // 내장 뷰는 saved_views에서 해당 타입의 뷰를 찾거나, 없으면 생성
    const existing = myViews.find(v => v.view_type === viewType);
    if (existing) {
      router.push(`/view/${existing.id}`);
    } else {
      // TODO: 자동 생성 후 이동
      router.push(`/view/builtin-${viewType}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '0 32px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        height: 80, display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button
          onClick={() => router.push('/my')}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '0.5px solid var(--ou-border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="var(--ou-text-dimmed)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--ou-text-strong)', letterSpacing: 2 }}>
          Orbit
        </span>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4,
        borderBottom: '1px solid var(--ou-border-subtle)',
        marginBottom: 28,
      }}>
        {([
          { key: 'my' as Tab, label: '내 뷰' },
          { key: 'builtin' as Tab, label: '기본 내장' },
          { key: 'market' as Tab, label: '마켓' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', fontSize: 13, cursor: 'pointer',
              marginBottom: -1,
              color: tab === t.key ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)',
              borderBottom: tab === t.key ? '2px solid var(--ou-text-strong)' : '2px solid transparent',
              transition: 'var(--ou-transition)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'my' && (
        <div>
          {loading ? (
            <p style={{ color: 'var(--ou-text-dimmed)', fontSize: 13 }}>불러오는 중...</p>
          ) : myViews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ou-text-dimmed)' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>◉</div>
              <div style={{ fontSize: 14 }}>아직 저장한 뷰가 없어요</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>기본 내장 탭에서 뷰를 추가해보세요</div>
            </div>
          ) : (
            <ViewGrid
              views={myViews.map(v => ({
                id: v.id,
                name: v.name,
                icon: VIEW_ICONS[v.view_type] || '◉',
                viewType: v.view_type,
              }))}
              onOpen={openView}
            />
          )}
        </div>
      )}

      {tab === 'builtin' && (
        <ViewGrid
          views={BUILTIN_VIEWS.map(v => ({
            id: v.id,
            name: v.name,
            icon: v.icon,
            viewType: v.viewType,
          }))}
          onOpen={(_, viewType) => openBuiltin(viewType!)}
        />
      )}

      {tab === 'market' && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ou-text-dimmed)' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🪐</div>
          <div style={{ fontSize: 14 }}>Orbit 마켓 준비 중</div>
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>
            다른 사용자가 만든 뷰를 구매하고 내 데이터에 적용할 수 있어요
          </div>
        </div>
      )}
    </div>
  );
}

function ViewGrid({ views, onOpen }: {
  views: { id: string; name: string; icon: string; viewType?: string }[];
  onOpen: (id: string, viewType?: string) => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: 16,
    }}>
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onOpen(view.id, view.viewType)}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 8,
            padding: '20px 8px',
            borderRadius: 14,
            border: '1px solid transparent',
            cursor: 'pointer',
            transition: '150ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--ou-border-faint)';
            e.currentTarget.style.borderColor = 'var(--ou-border-faint)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: 'var(--ou-border-faint)',
            border: '1px solid var(--ou-border-faint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>
            {view.icon}
          </div>
          <span style={{
            fontSize: 11, color: 'var(--ou-text-secondary)',
            textAlign: 'center', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis',
            width: '100%', whiteSpace: 'nowrap',
          }}>
            {view.name}
          </span>
        </button>
      ))}
    </div>
  );
}
