'use client';

import { useRouter } from 'next/navigation';
import { useWidgetStore } from '@/stores/widgetStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { ROUTES } from '@/lib/ou-registry';
import { OuButton } from '@/components/ds';
import { DOMAIN_WIDGET_MAP } from '@/data/tutorial';

interface Props {
  domain: string;
  nodeId?: string;
}

export function AddToHomeButton({ domain }: Props) {
  const router = useRouter();
  const widgets = useWidgetStore(s => s.pages[s.currentPageIndex]?.widgets ?? []);
  const addWidget = useWidgetStore(s => s.addWidget);
  const { isActive, completeStep } = useTutorialStore();

  const widgetType = DOMAIN_WIDGET_MAP[domain];
  if (!widgetType) return null;

  const alreadyAdded = widgets.some(w => w.type === widgetType);

  const handleAdd = () => {
    if (isActive()) {
      // 튜토리얼 중에는 편집 모드 스킵 — 자동 배치 후 스텝 완료
      if (!alreadyAdded) {
        const id = `${widgetType}-${Date.now()}`;
        addWidget({ id, type: widgetType, x: 1, y: 4, w: 2, h: 2 });
      }
      completeStep();
      window.dispatchEvent(new CustomEvent('orb-close'));
      router.push(ROUTES.HOME);
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
    <OuButton
      size="sm"
      onClick={handleAdd}
      style={{ marginTop: 10, fontSize: 13, width: '100%' }}
    >
      {alreadyAdded ? '배치 조정하기' : '홈 화면에 추가하기'}
    </OuButton>
  );
}
