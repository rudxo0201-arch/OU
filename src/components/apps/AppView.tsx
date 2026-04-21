'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BaseAppLayout } from './BaseAppLayout';
import { VIEW_REGISTRY } from '@/components/views/registry';
import { WidgetEmptyState } from '@/components/widgets/WidgetEmptyState';
import type { AppDef } from '@/lib/apps/registry';

interface Props {
  appDef: AppDef;
  nodes: any[];
  activeView: string;
}

/**
 * APP_REGISTRY 기반 범용 앱 뷰.
 * 뷰 전환, 사이드바 필터, DataNode 렌더링을 담당.
 */
export function AppView({ appDef, nodes, activeView: initialView }: Props) {
  const router = useRouter();
  const [activeView, setActiveView] = useState(initialView);

  const ViewComp = VIEW_REGISTRY[activeView];
  const allViews = [appDef.defaultView, ...appDef.alternateViews];

  function switchView(viewKey: string) {
    setActiveView(viewKey);
    router.replace(`/app/${appDef.slug}?view=${viewKey}`, { scroll: false });
  }

  // 뷰 전환 버튼 (헤더 우측)
  const viewSwitcher = allViews.length > 1 ? (
    <div style={{ display: 'flex', gap: 4 }}>
      {allViews.map(v => (
        <button
          key={v}
          onClick={() => switchView(v)}
          style={{
            padding: '4px 10px',
            fontSize: 11, fontWeight: 500,
            border: 'none', borderRadius: 6, cursor: 'pointer',
            background: v === activeView ? 'var(--ou-bg)' : 'transparent',
            boxShadow: v === activeView ? 'var(--ou-neu-pressed-sm)' : 'none',
            color: v === activeView ? 'var(--ou-text-strong)' : 'var(--ou-text-muted)',
            transition: 'all 150ms ease',
          }}
        >
          {VIEW_LABELS[v] ?? v}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <BaseAppLayout
      appLabel={appDef.label}
      sidebar={<AppSidebar appDef={appDef} nodes={nodes} />}
      headerRight={viewSwitcher}
    >
      <div style={{ padding: '24px 28px', minHeight: '100%' }}>
        {nodes.length === 0 ? (
          <div style={{ maxWidth: 360, margin: '60px auto' }}>
            <WidgetEmptyState skeleton={DOMAIN_SKELETON[appDef.domain] ?? 'list'} cta="Q에서 기록하세요" />
          </div>
        ) : ViewComp ? (
          <ViewComp nodes={nodes} />
        ) : (
          <div style={{ color: 'var(--ou-text-muted)', fontSize: 13 }}>
            뷰를 불러올 수 없습니다 ({activeView})
          </div>
        )}
      </div>
    </BaseAppLayout>
  );
}

/** 앱별 사이드바 — 기본: 총 건수 표시 */
function AppSidebar({ appDef, nodes }: { appDef: AppDef; nodes: any[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
        color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
        fontFamily: 'var(--ou-font-logo)',
        marginBottom: 12,
      }}>
        {appDef.label}
      </div>

      <div style={{
        fontSize: 12, color: 'var(--ou-text-muted)',
        padding: '6px 8px',
        borderRadius: 'var(--ou-radius-sm)',
      }}>
        전체 <span style={{ fontWeight: 600, color: 'var(--ou-text-body)', fontFamily: 'var(--ou-font-mono)' }}>
          {nodes.length}
        </span>
      </div>
    </div>
  );
}

const VIEW_LABELS: Record<string, string> = {
  calendar: '캘린더',
  timeline: '타임라인',
  table: '테이블',
  todo: '체크리스트',
  task: '칸반',
  chart: '차트',
  heatmap: '히트맵',
  journal: '저널',
  idea: '카드',
  profile: '프로필',
  map: '지도',
  scrap: '스크랩',
};

const DOMAIN_SKELETON: Record<string, 'finance' | 'schedule' | 'task' | 'habit' | 'idea' | 'list'> = {
  schedule: 'schedule',
  task: 'task',
  finance: 'finance',
  habit: 'habit',
  idea: 'idea',
  relation: 'list',
  location: 'list',
  health: 'list',
  media: 'list',
};
