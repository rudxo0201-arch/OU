'use client';

import { useWidgetStore } from '@/stores/widgetStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { NeuButton } from '@/components/ds';
import { DOMAIN_WIDGET_MAP } from '@/data/tutorial';

interface Props {
  domain: string;
  nodeId?: string;
}

export function AddToHomeButton({ domain, nodeId }: Props) {
  const widgets = useWidgetStore(s => s.pages[s.currentPageIndex]?.widgets ?? []);
  const addWidget = useWidgetStore(s => s.addWidget);
  const { isActive, enterEditMode } = useTutorialStore();

  const widgetType = DOMAIN_WIDGET_MAP[domain];
  if (!widgetType) return null;

  // 이미 홈에 있으면 숨김
  const alreadyAdded = widgets.some(w => w.type === widgetType);
  if (alreadyAdded) return null;

  const handleAdd = () => {
    const id = `${widgetType}-${Date.now()}`;
    // 임시 위치(0,0)로 추가 — 편집 모드에서 회원이 직접 조정
    addWidget({ id, type: widgetType, x: 0, y: 0, w: 2, h: 2 });

    // 편집 모드 진입 + 튜토리얼 상태 전환
    if (isActive()) {
      enterEditMode({ type: widgetType, id });
    }

    // Orb 닫기 이벤트
    window.dispatchEvent(new CustomEvent('orb-close'));
    // 편집 모드 진입 이벤트 (WidgetGrid에서 수신)
    window.dispatchEvent(new CustomEvent('widget-edit-mode-enter'));
  };

  return (
    <NeuButton
      size="sm"
      onClick={handleAdd}
      style={{ marginTop: 10, fontSize: 13, width: '100%' }}
    >
      홈 화면에 추가하기
    </NeuButton>
  );
}
