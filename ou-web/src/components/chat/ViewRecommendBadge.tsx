'use client';

import { useState } from 'react';
import { CalendarBlank, ChartBar, Graph, ListChecks, ArrowRight } from '@phosphor-icons/react';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { useNavigationStore } from '@/stores/navigationStore';

interface ViewRecommendBadgeProps {
  domain: string;
  viewType: string;
  nodes: any[];
}

const VIEW_CONFIG: Record<string, { icon: React.ElementType; copy: string; label: string }> = {
  calendar: {
    icon: CalendarBlank,
    copy: '일정이 꽤 쌓였네요. 캘린더로 한눈에 볼까요?',
    label: '캘린더',
  },
  task: {
    icon: ListChecks,
    copy: '할 일이 쌓이고 있어요. 칸반으로 정리해볼까요?',
    label: '칸반',
  },
  knowledge_graph: {
    icon: Graph,
    copy: '지식이 많이 쌓였어요. 연결 관계를 볼까요?',
    label: '그래프',
  },
  chart: {
    icon: ChartBar,
    copy: '지출 내역이 쌓였네요. 차트로 정리해볼까요?',
    label: '차트',
  },
};

const filledBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'inherit',
  border: 'none',
  borderRadius: 'var(--ou-radius-pill)',
  cursor: 'pointer',
  transition: 'var(--ou-transition)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255,255,255,0.9)',
  color: '#111',
};

const subtleBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'inherit',
  border: 'none',
  borderRadius: 'var(--ou-radius-pill)',
  cursor: 'pointer',
  transition: 'var(--ou-transition)',
  background: 'transparent',
  color: 'var(--ou-text-dimmed)',
};

export function ViewRecommendBadge({ domain, viewType, nodes }: ViewRecommendBadgeProps) {
  const [shown, setShown] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { addSavedView } = useNavigationStore();

  const config = VIEW_CONFIG[viewType] ?? {
    icon: Graph,
    copy: '데이터가 쌓였어요. 뷰로 볼까요?',
    label: '뷰',
  };
  const Icon = config.icon;

  const handleSave = () => {
    addSavedView({
      id: `${domain}-${Date.now()}`,
      name: `${config.label} 뷰`,
      viewType,
    });
    setSaved(true);
  };

  if (dismissed) return null;

  if (saved) {
    return (
      <p style={{ fontSize: 13, color: 'var(--ou-text-dimmed)', padding: '4px 0', margin: 0 }}>
        뷰가 저장됐어요. 내 우주에서 확인할 수 있어요.
      </p>
    );
  }

  return (
    <div
      style={{
        padding: 12,
        border: '0.5px solid var(--ou-border-subtle)',
        borderRadius: 'var(--ou-radius-md)',
        background: 'var(--ou-surface-faint)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'nowrap', marginBottom: shown ? 8 : 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} weight="bold" />
        </div>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--ou-text-body)' }}>{config.copy}</span>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'center', flexWrap: 'nowrap' }}>
          {!shown && (
            <button
              style={filledBtnStyle}
              onClick={() => setShown(true)}
            >
              보기 <ArrowRight size={12} />
            </button>
          )}
          {shown && (
            <button style={filledBtnStyle} onClick={handleSave}>
              저장하기
            </button>
          )}
          <button
            style={subtleBtnStyle}
            onClick={() => setDismissed(true)}
          >
            괜찮아요
          </button>
        </div>
      </div>
      {shown && <ViewRenderer viewType={viewType} nodes={nodes} inline />}
    </div>
  );
}
