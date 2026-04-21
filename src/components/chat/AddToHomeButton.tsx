'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWidgetStore } from '@/stores/widgetStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { NeuButton } from '@/components/ds';
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
  const [added, setAdded] = useState(false);

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
      router.push('/home');
      return;
    }

    if (alreadyAdded || added) return;

    const id = `${widgetType}-${Date.now()}`;
    addWidget({ id, type: widgetType, x: 0, y: 0, w: 2, h: 2 });
    setAdded(true);
    // 페이지 이동 없이 인라인 피드백만
  };

  // 이미 추가됐으면 상태 표시
  const isDone = alreadyAdded || added;

  return (
    <NeuButton
      size="sm"
      onClick={handleAdd}
      disabled={isDone && !isActive()}
      style={{
        marginTop: 10, fontSize: 13, width: '100%',
        opacity: isDone && !isActive() ? 0.6 : 1,
        cursor: isDone && !isActive() ? 'default' : 'pointer',
      }}
    >
      {isActive() && alreadyAdded
        ? '배치 조정하기'
        : isDone
          ? '홈에 추가됨 ✓'
          : '홈 화면에 추가하기'}
    </NeuButton>
  );
}
