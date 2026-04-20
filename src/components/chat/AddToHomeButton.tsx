'use client';

import { useWidgetStore } from '@/stores/widgetStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { NeuButton } from '@/components/ds';
import { DOMAIN_WIDGET_MAP } from '@/data/tutorial';

interface Props {
  domain: string;
  nodeId?: string;
}

export function AddToHomeButton({ domain }: Props) {
  const widgets = useWidgetStore(s => s.pages[s.currentPageIndex]?.widgets ?? []);
  const addWidget = useWidgetStore(s => s.addWidget);
  const { isActive, enterEditMode } = useTutorialStore();

  const widgetType = DOMAIN_WIDGET_MAP[domain];
  if (!widgetType) return null;

  const alreadyAdded = widgets.some(w => w.type === widgetType);

  const handleAdd = () => {
    if (isActive()) {
      if (!alreadyAdded) {
        const id = `${widgetType}-${Date.now()}`;
        addWidget({ id, type: widgetType, x: 0, y: 0, w: 2, h: 2 });
        enterEditMode({ type: widgetType, id });
        window.dispatchEvent(new CustomEvent('orb-close'));
        window.dispatchEvent(new CustomEvent('widget-edit-mode-enter'));
      } else {
        // 위젯이 이미 있으면 편집 모드 없이 스텝만 진행
        enterEditMode({ type: widgetType, id: widgetType });
        window.dispatchEvent(new CustomEvent('orb-close'));
        window.dispatchEvent(new CustomEvent('widget-edit-mode-enter'));
      }
      return;
    }

    if (alreadyAdded) return;
    const id = `${widgetType}-${Date.now()}`;
    addWidget({ id, type: widgetType, x: 0, y: 0, w: 2, h: 2 });
    window.dispatchEvent(new CustomEvent('orb-close'));
    window.dispatchEvent(new CustomEvent('widget-edit-mode-enter'));
  };

  // 튜토리얼 중이 아니고 위젯이 이미 있으면 숨김
  if (alreadyAdded && !isActive()) return null;

  return (
    <NeuButton
      size="sm"
      onClick={handleAdd}
      style={{ marginTop: 10, fontSize: 13, width: '100%' }}
    >
      {alreadyAdded ? '배치 조정하기' : '홈 화면에 추가하기'}
    </NeuButton>
  );
}
