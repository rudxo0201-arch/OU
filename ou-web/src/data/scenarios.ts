/**
 * 시나리오 가이드 데이터
 *
 * stage:
 *  - guest: 비로그인 체험용 (채팅 첫 화면)
 *  - onboarding: 가입 직후 미사용 도메인 추천
 *  - active: 데이터 패턴 감지 시 추천
 */

export interface Scenario {
  id: string;
  title: string;
  description: string;
  prompt: string;
  expectedViews: string[];
  domain: string;
  stage: 'guest' | 'onboarding' | 'active';
  icon: string; // Phosphor icon name
}

export const SCENARIOS: Scenario[] = [
  // ── guest: 비로그인 체험용 ──
  {
    id: 'schedule-demo',
    title: '일정 등록하기',
    description: '한 마디로 캘린더와 지도가 생겨요',
    prompt: '다음주 금요일 7시 강남역에서 친구 모임',
    expectedViews: ['calendar', 'map'],
    domain: 'schedule',
    stage: 'guest',
    icon: 'CalendarBlank',
  },
  {
    id: 'finance-demo',
    title: '지출 기록하기',
    description: '말하면 자동으로 가계부가 돼요',
    prompt: '점심 김밥 8000원, 커피 4500원, 택시 12000원',
    expectedViews: ['chart'],
    domain: 'finance',
    stage: 'guest',
    icon: 'CurrencyKrw',
  },
  {
    id: 'task-demo',
    title: '할 일 정리하기',
    description: '할 일을 말하면 보드가 만들어져요',
    prompt: '리포트 금요일까지, 세탁소 내일 가기, 엄마한테 전화하기',
    expectedViews: ['task'],
    domain: 'task',
    stage: 'guest',
    icon: 'CheckSquare',
  },
  {
    id: 'emotion-demo',
    title: '오늘 하루 기록하기',
    description: '감정과 일상이 일기장이 돼요',
    prompt: '오늘 좀 지쳤다. 야근이 길었는데 그래도 프로젝트 마무리해서 뿌듯',
    expectedViews: ['journal'],
    domain: 'emotion',
    stage: 'guest',
    icon: 'SmileyMeh',
  },

  // ── onboarding: 가입 직후 ──
  {
    id: 'habit-onboard',
    title: '습관 추적하기',
    description: '매일 기록하면 잔디가 채워져요',
    prompt: '오늘 러닝 30분 완료',
    expectedViews: ['heatmap'],
    domain: 'habit',
    stage: 'onboarding',
    icon: 'Barbell',
  },
  {
    id: 'relation-onboard',
    title: '사람 기록하기',
    description: '인맥을 한눈에 관리해요',
    prompt: '희민이 생일 5월 3일, 대학 친구, 010-1234-5678',
    expectedViews: ['relationship'],
    domain: 'relation',
    stage: 'onboarding',
    icon: 'Users',
  },

  // ── active: 사용 중 추천 ──
  {
    id: 'meeting-active',
    title: '회의록 정리하기',
    description: '회의 내용이 자동으로 구조화돼요',
    prompt: '오늘 마케팅 회의: 4월 캠페인 예산 500만원, 담당 수진, 마감 4월 25일',
    expectedViews: ['task', 'calendar', 'relationship'],
    domain: 'task',
    stage: 'active',
    icon: 'Notebook',
  },
  {
    id: 'idea-active',
    title: '아이디어 저장하기',
    description: '떠오르는 생각을 놓치지 마세요',
    prompt: '앱에서 음성으로 메모하면 자동 정리되는 기능 만들면 좋겠다',
    expectedViews: ['mindmap'],
    domain: 'idea',
    stage: 'active',
    icon: 'Lightbulb',
  },
  {
    id: 'reading-active',
    title: '독서 메모하기',
    description: '읽은 내용이 지식 그래프로 연결돼요',
    prompt: '사피엔스 42쪽: 인지혁명이 호모 사피엔스를 지구 지배종으로 만들었다',
    expectedViews: ['knowledge_graph'],
    domain: 'knowledge',
    stage: 'active',
    icon: 'BookOpen',
  },
  {
    id: 'gift-active',
    title: '선물 기록하기',
    description: '누구에게 뭘 줬는지 기억해요',
    prompt: '희민이 생일에 향수 선물함 5만원',
    expectedViews: ['relationship', 'chart'],
    domain: 'finance',
    stage: 'active',
    icon: 'Gift',
  },
];

export function getScenariosByStage(stage: Scenario['stage']): Scenario[] {
  return SCENARIOS.filter(s => s.stage === stage);
}

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find(s => s.id === id);
}
