/**
 * 시나리오 카드 데이터
 *
 * stage:
 *  - guest: 비로그인 체험용 (갤러리 오버레이)
 *  - onboarding: 가입 직후 미사용 도메인 추천
 *  - active: 사용 중 채팅 인라인 추천
 *
 * tier:
 *  - primary: 필수 6장 (갤러리 상단)
 *  - secondary: 선택 4장 (스크롤하면 더)
 *  - persona: 페르소나별 추가 (카드 선택 패턴 기반 추천)
 */

export interface Scenario {
  id: string;
  title: string;
  description: string;
  prompt: string;
  resultPreview: string;
  expectedViews: string[];
  domain: string;
  stage: 'guest' | 'onboarding' | 'active';
  tier: 'primary' | 'secondary' | 'persona';
  icon: string;
  relatedIds?: string[];
}

export const SCENARIOS: Scenario[] = [
  // ══════════════════════════════════════
  // guest / primary — 필수 6장 (갤러리 상단)
  // ══════════════════════════════════════
  {
    id: 'schedule-demo',
    title: '일정 등록',
    description: '한 마디로 캘린더가 생겨요',
    prompt: '다음주 금요일 7시 강남역에서 친구 모임',
    resultPreview: '캘린더가 생겨요',
    expectedViews: ['calendar'],
    domain: 'schedule',
    stage: 'guest',
    tier: 'primary',
    icon: 'CalendarBlank',
    relatedIds: ['finance-demo', 'task-demo'],
  },
  {
    id: 'finance-demo',
    title: '지출 기록',
    description: '말하면 자동으로 차트가 돼요',
    prompt: '점심 김밥 8000원, 커피 4500원, 택시 12000원',
    resultPreview: '지출 차트가 생겨요',
    expectedViews: ['chart'],
    domain: 'finance',
    stage: 'guest',
    tier: 'primary',
    icon: 'CurrencyKrw',
    relatedIds: ['schedule-demo', 'task-demo'],
  },
  {
    id: 'task-demo',
    title: '할 일 정리',
    description: '할 일을 말하면 보드가 만들어져요',
    prompt: '리포트 금요일까지, 세탁소 내일 가기, 엄마한테 전화하기',
    resultPreview: '할일 보드가 생겨요',
    expectedViews: ['task'],
    domain: 'task',
    stage: 'guest',
    tier: 'primary',
    icon: 'CheckSquare',
    relatedIds: ['schedule-demo', 'finance-demo'],
  },
  {
    id: 'knowledge-demo',
    title: '독서 메모',
    description: '읽은 내용이 지식 그래프로 연결돼요',
    prompt: '사피엔스 읽었는데 인지혁명이 호모 사피엔스를 지구 지배종으로 만든 핵심이었다',
    resultPreview: '지식 그래프가 생겨요',
    expectedViews: ['knowledge_graph'],
    domain: 'knowledge',
    stage: 'guest',
    tier: 'primary',
    icon: 'BookOpen',
    relatedIds: ['idea-demo', 'emotion-demo'],
  },
  {
    id: 'idea-demo',
    title: '아이디어 저장',
    description: '떠오르는 생각이 마인드맵이 돼요',
    prompt: '앱에서 음성으로 메모하면 자동 정리되는 기능 만들면 좋겠다',
    resultPreview: '마인드맵이 생겨요',
    expectedViews: ['mindmap'],
    domain: 'idea',
    stage: 'guest',
    tier: 'primary',
    icon: 'Lightbulb',
    relatedIds: ['knowledge-demo', 'task-demo'],
  },
  {
    id: 'emotion-demo',
    title: '오늘 하루 기록',
    description: '감정과 일상이 일기장이 돼요',
    prompt: '오늘 좀 지쳤다. 야근이 길었는데 그래도 프로젝트 마무리해서 뿌듯',
    resultPreview: '감정 일기가 생겨요',
    expectedViews: ['journal'],
    domain: 'emotion',
    stage: 'guest',
    tier: 'primary',
    icon: 'SmileyMeh',
    relatedIds: ['task-demo', 'schedule-demo'],
  },

  // ══════════════════════════════════════
  // guest / secondary — 선택 4장 (스크롤하면 더)
  // ══════════════════════════════════════
  {
    id: 'habit-demo',
    title: '습관 추적',
    description: '매일 기록하면 잔디가 채워져요',
    prompt: '오늘 러닝 30분 완료',
    resultPreview: '잔디 히트맵이 생겨요',
    expectedViews: ['heatmap'],
    domain: 'habit',
    stage: 'guest',
    tier: 'secondary',
    icon: 'Barbell',
  },
  {
    id: 'relation-demo',
    title: '사람 기록',
    description: '인맥을 한눈에 관리해요',
    prompt: '희민이 생일 5월 3일, 대학 친구',
    resultPreview: '관계 카드가 생겨요',
    expectedViews: ['relationship'],
    domain: 'relation',
    stage: 'guest',
    tier: 'secondary',
    icon: 'Users',
  },
  {
    id: 'youtube-demo',
    title: '영상 정리',
    description: '유튜브 링크로 핵심 요약이 생겨요',
    prompt: '이 영상 핵심만 정리해줘 https://youtube.com/watch?v=example',
    resultPreview: '영상 요약이 생겨요',
    expectedViews: ['transcript'],
    domain: 'knowledge',
    stage: 'guest',
    tier: 'secondary',
    icon: 'YoutubeLogo',
  },
  {
    id: 'meeting-demo',
    title: '회의록 정리',
    description: '회의 내용이 자동으로 구조화돼요',
    prompt: '오늘 마케팅 회의: 4월 캠페인 예산 500만원, 담당 수진, 마감 4월 25일',
    resultPreview: '회의록 보드가 생겨요',
    expectedViews: ['task', 'calendar'],
    domain: 'task',
    stage: 'guest',
    tier: 'secondary',
    icon: 'Notebook',
  },
  {
    id: 'timetable-demo',
    title: '시간표 등록',
    description: '시간표 사진으로 캘린더가 생겨요',
    prompt: '시간표 사진을 올렸어요',
    resultPreview: '수업 캘린더가 생겨요',
    expectedViews: ['calendar'],
    domain: 'schedule',
    stage: 'guest',
    tier: 'secondary',
    icon: 'CalendarBlank',
  },

  // ══════════════════════════════════════
  // onboarding — 가입 직후 추천
  // ══════════════════════════════════════
  {
    id: 'quiz-onboard',
    title: '퀴즈로 복습',
    description: '배운 내용이 퀴즈로 바뀌어요',
    prompt: '오늘 배운 내용으로 퀴즈를 만들어줘. 광합성은 식물이 빛 에너지를 이용해 이산화탄소와 물을 포도당으로 변환하는 과정이야.',
    resultPreview: '퀴즈가 생겨요',
    expectedViews: ['quiz', 'flashcard'],
    domain: 'knowledge',
    stage: 'onboarding',
    tier: 'primary',
    icon: 'Brain',
  },
  {
    id: 'project-onboard',
    title: '프로젝트 관리',
    description: '일정을 말하면 간트 차트가 만들어져요',
    prompt: '이번 달 프로젝트: 기획서 4월 20일까지, 디자인 4월 25일까지, 개발 5월 5일까지',
    resultPreview: '간트 차트가 생겨요',
    expectedViews: ['gantt', 'task'],
    domain: 'task',
    stage: 'onboarding',
    tier: 'primary',
    icon: 'ListChecks',
  },

  // ══════════════════════════════════════
  // active — 사용 중 채팅 인라인 추천
  // ══════════════════════════════════════
  {
    id: 'priority-active',
    title: '우선순위 정리',
    description: '중요도와 긴급도로 분류해요',
    prompt: '보고서 마감이 급하고, 운동은 중요하지만 급하진 않아, 이메일은 급하지만 중요하지 않아',
    resultPreview: '우선순위 매트릭스가 생겨요',
    expectedViews: ['matrix', 'task'],
    domain: 'task',
    stage: 'active',
    tier: 'primary',
    icon: 'FunnelSimple',
  },
  {
    id: 'gift-active',
    title: '선물 기록',
    description: '누구에게 뭘 줬는지 기억해요',
    prompt: '희민이 생일에 향수 선물함 5만원',
    resultPreview: '관계+지출이 연결돼요',
    expectedViews: ['relationship', 'chart'],
    domain: 'finance',
    stage: 'active',
    tier: 'primary',
    icon: 'Gift',
  },
  {
    id: 'budget-active',
    title: '예산 관리',
    description: '이번 달 예산을 잡아볼까요?',
    prompt: '이번 달 식비 예산 30만원, 교통비 10만원, 여가 15만원으로 잡아줘',
    resultPreview: '예산 추적이 생겨요',
    expectedViews: ['chart'],
    domain: 'finance',
    stage: 'active',
    tier: 'primary',
    icon: 'ChartPie',
  },
];

/** stage별 시나리오 조회 */
export function getScenariosByStage(stage: Scenario['stage']): Scenario[] {
  return SCENARIOS.filter(s => s.stage === stage);
}

/** tier별 시나리오 조회 */
export function getScenariosByTier(stage: Scenario['stage'], tier: Scenario['tier']): Scenario[] {
  return SCENARIOS.filter(s => s.stage === stage && s.tier === tier);
}

/** ID로 시나리오 조회 */
export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find(s => s.id === id);
}

/** 관련 시나리오 조회 (추가 추천용) */
export function getRelatedScenarios(scenarioId: string): Scenario[] {
  const scenario = getScenarioById(scenarioId);
  if (!scenario?.relatedIds) return [];
  return scenario.relatedIds
    .map(id => getScenarioById(id))
    .filter((s): s is Scenario => s !== undefined);
}
