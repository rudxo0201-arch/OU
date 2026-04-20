export interface TutorialStep {
  id: string;
  /** 말풍선에 표시되는 가이드 메시지 (Step 1~6: /my 위, Step 7: Orb 안) */
  guideMessage: string;
  /** OuViewWidget 또는 ChatInput의 ghost text */
  ghostText?: string;
  /** 예상 도메인 (DataNode 생성 감지용) */
  domain: string;
  /** 추가할 위젯 타입 */
  widgetType?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'task',
    guideMessage: '오늘 할 일을 입력해보세요!',
    ghostText: '장보기, 병원 예약, 친구한테 답장하기',
    domain: 'task',
    widgetType: 'view-todo',
  },
  {
    id: 'schedule',
    guideMessage: '다가오는 약속이 있다면 알려주세요!',
    ghostText: '이번 주 토요일 2시 카페에서 친구 만남',
    domain: 'schedule',
    widgetType: 'view-calendar',
  },
  {
    id: 'finance',
    guideMessage: '오늘 지출이 있었다면 기록해볼까요?',
    ghostText: '점심 국밥 9000원, 커피 5500원',
    domain: 'finance',
    widgetType: 'view-chart',
  },
  {
    id: 'memo',
    guideMessage: '갑자기 떠오른 생각이 있다면 적어보세요',
    ghostText: '다음 여행 때 제주도 맛집 리스트 만들기',
    domain: 'idea',
    widgetType: 'quick-memo',
  },
  {
    id: 'habit',
    guideMessage: '매일 하는 루틴이 있다면 기록해보세요',
    ghostText: '운동 30분 완료',
    domain: 'habit',
    widgetType: 'view-heatmap',
  },
  {
    id: 'relation',
    guideMessage: '주변 사람 정보를 기록해보세요',
    ghostText: '희민이 생일 5월 3일, 대학 친구',
    domain: 'relation',
    widgetType: 'view-relation',
  },
  {
    id: 'profile',
    guideMessage: '마지막으로, OU가 더 잘 도와드리려면 조금만 알려주세요',
    domain: 'profile',
    widgetType: 'view-profile',
  },
];

export const TUTORIAL_STEP_COUNT = TUTORIAL_STEPS.length; // 7

export function getTutorialStep(index: number): TutorialStep | null {
  return TUTORIAL_STEPS[index] ?? null;
}

/** 도메인 → 위젯 타입 매핑 (홈 화면에 추가하기용) */
export const DOMAIN_WIDGET_MAP: Record<string, string> = {
  task: 'view-todo',
  schedule: 'view-calendar',
  finance: 'view-chart',
  idea: 'quick-memo',
  habit: 'view-heatmap',
  relation: 'view-relation',
  profile: 'view-profile',
  knowledge: 'recent-nodes',
};
