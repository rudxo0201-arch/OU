export interface TutorialStep {
  id: string;
  /** Orb 안에 표시되는 가이드 메시지 */
  guideMessage: string;
  /** OuViewWidget의 ghost text */
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
    widgetType: 'today-tasks',
  },
  {
    id: 'schedule',
    guideMessage: '다가오는 약속이 있다면 알려주세요!',
    ghostText: '이번 주 토요일 2시 카페에서 친구 만남',
    domain: 'schedule',
    widgetType: 'today-schedule',
  },
  {
    id: 'finance',
    guideMessage: '오늘 지출이 있었다면 기록해볼까요?',
    ghostText: '점심 국밥 9000원, 커피 5500원',
    domain: 'finance',
    widgetType: 'view-chart',
  },
  {
    id: 'habit',
    guideMessage: '꾸준히 하고 싶은 습관이 있나요?',
    ghostText: '오늘 물 2L 마셨어',
    domain: 'habit',
    widgetType: 'habit-log',
  },
];

export const TUTORIAL_STEP_COUNT = TUTORIAL_STEPS.length; // 4

export function getTutorialStep(index: number): TutorialStep | null {
  return TUTORIAL_STEPS[index] ?? null;
}

/** 도메인 → 위젯 타입 매핑 (홈 화면에 추가하기용) */
export const DOMAIN_WIDGET_MAP: Record<string, string> = {
  task: 'today-tasks',
  schedule: 'today-schedule',
  finance: 'view-chart',
  idea: 'quick-memo',
  habit: 'habit-log',
  relation: 'view-relation',
  knowledge: 'recent-nodes',
};
