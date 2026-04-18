/**
 * 시연 데이터 — /try 비회원 체험용
 * LLM 호출 없이 미리 짜놓은 대화를 타이핑 애니메이션으로 재생
 */

export interface DemoStep {
  type: 'user' | 'assistant' | 'node' | 'view';
  content?: string;
  delay: number;              // 이전 스텝 후 대기 ms
  typingSpeed?: number;       // 글자당 ms (assistant만)
  node?: {
    id: string;
    domain: string;
    raw: string;
    domain_data: Record<string, any>;
  };
  view?: {
    viewType: string;
    nodes: any[];
  };
}

export interface ScenarioDemo {
  scenarioId: string;
  steps: DemoStep[];
}

// 다음주 금요일 계산
function getNextFriday(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = ((5 - day + 7) % 7) || 7;
  const nextFri = new Date(now.getTime() + daysUntilFriday * 86400000);
  return nextFri.toISOString().split('T')[0];
}

export const SCENARIO_DEMOS: ScenarioDemo[] = [
  // ═══ 일정 ═══
  {
    scenarioId: 'schedule-demo',
    steps: [
      {
        type: 'user',
        content: '다음주 금요일 7시 강남역에서 친구 모임',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '모임 일정 잡았어요.',
        delay: 800,
        typingSpeed: 40,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-schedule-1',
          domain: 'schedule',
          raw: '다음주 금요일 7시 강남역에서 친구 모임',
          domain_data: {
            title: '친구 모임',
            date: getNextFriday(),
            time: '19:00',
            location: '강남역',
          },
        },
      },
      {
        type: 'view',
        delay: 400,
        view: {
          viewType: 'calendar',
          nodes: [{
            id: 'demo-schedule-1',
            domain: 'schedule',
            raw: '다음주 금요일 7시 강남역에서 친구 모임',
            domain_data: {
              title: '친구 모임',
              date: getNextFriday(),
              time: '19:00',
              location: '강남역',
            },
            created_at: new Date().toISOString(),
          }],
        },
      },
    ],
  },

  // ═══ 지출 ═══
  {
    scenarioId: 'finance-demo',
    steps: [
      {
        type: 'user',
        content: '점심 김밥 8000원, 커피 4500원, 택시 12000원',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '오늘 지출 기록했어요. 총 24,500원이에요.',
        delay: 800,
        typingSpeed: 35,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-finance-1',
          domain: 'finance',
          raw: '점심 김밥 8000원, 커피 4500원, 택시 12000원',
          domain_data: {
            amount: 24500,
            category: '식비',
            items: [
              { label: '김밥', amount: 8000, category: '식비' },
              { label: '커피', amount: 4500, category: '식비' },
              { label: '택시', amount: 12000, category: '교통' },
            ],
            date: new Date().toISOString().split('T')[0],
          },
        },
      },
      {
        type: 'view',
        delay: 400,
        view: {
          viewType: 'chart',
          nodes: [{
            id: 'demo-finance-1',
            domain: 'finance',
            raw: '점심 김밥 8000원, 커피 4500원, 택시 12000원',
            domain_data: {
              amount: 24500,
              date: new Date().toISOString().split('T')[0],
              items: [
                { label: '김밥', amount: 8000, category: '식비' },
                { label: '커피', amount: 4500, category: '식비' },
                { label: '택시', amount: 12000, category: '교통' },
              ],
            },
            created_at: new Date().toISOString(),
          }],
        },
      },
    ],
  },

  // ═══ 할일 ═══
  {
    scenarioId: 'task-demo',
    steps: [
      {
        type: 'user',
        content: '리포트 금요일까지, 세탁소 내일 가기, 엄마한테 전화하기',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '할 일 3개 정리했어요.',
        delay: 800,
        typingSpeed: 40,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-task-1',
          domain: 'task',
          raw: '리포트 금요일까지, 세탁소 내일 가기, 엄마한테 전화하기',
          domain_data: {
            title: '리포트',
            status: 'todo',
            priority: 'high',
            deadline: '금요일',
          },
        },
      },
      {
        type: 'view',
        delay: 400,
        view: {
          viewType: 'task',
          nodes: [
            { id: 'demo-task-1', domain: 'task', raw: '리포트 금요일까지', domain_data: { title: '리포트', status: 'todo', priority: 'high', deadline: '금요일' }, created_at: new Date().toISOString() },
            { id: 'demo-task-2', domain: 'task', raw: '세탁소 내일 가기', domain_data: { title: '세탁소', status: 'in_progress', priority: 'medium' }, created_at: new Date().toISOString() },
            { id: 'demo-task-3', domain: 'task', raw: '엄마한테 전화하기', domain_data: { title: '엄마 전화', status: 'todo', priority: 'medium' }, created_at: new Date().toISOString() },
          ],
        },
      },
    ],
  },

  // ═══ 지식 ═══
  {
    scenarioId: 'knowledge-demo',
    steps: [
      {
        type: 'user',
        content: '사피엔스 읽었는데 인지혁명이 호모 사피엔스를 지구 지배종으로 만든 핵심이었다',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '인지혁명은 약 7만 년 전에 일어났어요. 호모 사피엔스가 허구를 믿는 능력을 갖게 되면서, 대규모 협력이 가능해졌죠. 이게 다른 인류 종과의 결정적 차이였어요.',
        delay: 800,
        typingSpeed: 30,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-knowledge-1',
          domain: 'knowledge',
          raw: '사피엔스 - 인지혁명이 핵심',
          domain_data: {
            title: '인지혁명',
            description: '약 7만 년 전 호모 사피엔스가 허구를 믿는 능력을 갖게 된 사건',
            triples: [
              { subject: '인지혁명', predicate: 'causes', object: '대규모 협력' },
              { subject: '호모 사피엔스', predicate: 'is_a', object: '지구 지배종' },
            ],
          },
        },
      },
    ],
  },

  // ═══ 아이디어 ═══
  {
    scenarioId: 'idea-demo',
    steps: [
      {
        type: 'user',
        content: '앱에서 음성으로 메모하면 자동 정리되는 기능 만들면 좋겠다',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '좋은 아이디어에요! 음성 입력 → 자동 분류 → 구조화. 이동 중에도 손 안 쓰고 기록할 수 있겠네요.',
        delay: 800,
        typingSpeed: 30,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-idea-1',
          domain: 'idea',
          raw: '음성 메모 자동 정리 앱',
          domain_data: {
            title: '음성 메모 자동 정리',
            related: ['음성 입력', '자동 분류', '구조화', '이동 중 기록'],
          },
        },
      },
      {
        type: 'view',
        delay: 400,
        view: {
          viewType: 'mindmap',
          nodes: [{
            id: 'demo-idea-1',
            domain: 'idea',
            raw: '음성 메모 자동 정리 앱',
            domain_data: {
              title: '음성 메모 자동 정리',
              related: ['음성 입력', '자동 분류', '구조화', '이동 중 기록'],
            },
            created_at: new Date().toISOString(),
          }],
        },
      },
    ],
  },

  // ═══ 감정 ═══
  {
    scenarioId: 'emotion-demo',
    steps: [
      {
        type: 'user',
        content: '오늘 좀 지쳤다. 야근이 길었는데 그래도 프로젝트 마무리해서 뿌듯',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '고생했어요. 야근은 힘들지만, 마무리한 성취감은 값지죠.',
        delay: 800,
        typingSpeed: 35,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-emotion-1',
          domain: 'emotion',
          raw: '오늘 좀 지쳤다. 야근이 길었는데 프로젝트 마무리해서 뿌듯',
          domain_data: {
            mood: '뿌듯',
            title: '야근 후 프로젝트 마무리',
            content: '오늘 좀 지쳤다. 야근이 길었는데 그래도 프로젝트 마무리해서 뿌듯',
            date: new Date().toISOString().split('T')[0],
          },
        },
      },
      {
        type: 'view',
        delay: 400,
        view: {
          viewType: 'journal',
          nodes: [{
            id: 'demo-emotion-1',
            domain: 'emotion',
            raw: '오늘 좀 지쳤다. 야근이 길었는데 프로젝트 마무리해서 뿌듯',
            domain_data: {
              mood: '뿌듯',
              title: '야근 후 프로젝트 마무리',
              content: '오늘 좀 지쳤다. 야근이 길었는데 그래도 프로젝트 마무리해서 뿌듯',
              date: new Date().toISOString().split('T')[0],
            },
            created_at: new Date().toISOString(),
          }],
        },
      },
    ],
  },
  // ═══ 시간표 사진 ═══
  {
    scenarioId: 'timetable-demo',
    steps: [
      {
        type: 'user',
        content: '📸 시간표 사진을 올렸어요',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '시간표를 읽었어요. 이번 학기 수업 6개를 정리했어요.',
        delay: 1200,
        typingSpeed: 30,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-timetable-1',
          domain: 'schedule',
          raw: '이번 학기 시간표',
          domain_data: {
            title: '경영학원론',
            date: '2026-04-21',
            time: '09:00',
            location: '경영관 301호',
          },
        },
      },
      {
        type: 'view',
        delay: 400,
        view: {
          viewType: 'calendar',
          nodes: [
            { id: 'tt-1', domain: 'schedule', raw: '경영학원론 월수 9시', domain_data: { title: '경영학원론', date: '2026-04-21', time: '09:00', location: '경영관 301' }, created_at: new Date().toISOString() },
            { id: 'tt-2', domain: 'schedule', raw: '미적분학 월수 11시', domain_data: { title: '미적분학', date: '2026-04-21', time: '11:00', location: '이학관 201' }, created_at: new Date().toISOString() },
            { id: 'tt-3', domain: 'schedule', raw: '영어회화 화목 10시', domain_data: { title: '영어회화', date: '2026-04-22', time: '10:00', location: '어학관 105' }, created_at: new Date().toISOString() },
            { id: 'tt-4', domain: 'schedule', raw: '데이터분석 화목 13시', domain_data: { title: '데이터분석', date: '2026-04-22', time: '13:00', location: '공학관 402' }, created_at: new Date().toISOString() },
            { id: 'tt-5', domain: 'schedule', raw: '한국사 금 14시', domain_data: { title: '한국사', date: '2026-04-25', time: '14:00', location: '인문관 101' }, created_at: new Date().toISOString() },
            { id: 'tt-6', domain: 'schedule', raw: '체육 금 16시', domain_data: { title: '체육', date: '2026-04-25', time: '16:00', location: '체육관' }, created_at: new Date().toISOString() },
          ],
        },
      },
    ],
  },

  // ═══ 유튜브 링크 ═══
  {
    scenarioId: 'youtube-demo',
    steps: [
      {
        type: 'user',
        content: '이 영상 정리해줘 https://youtube.com/watch?v=example',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '영상 핵심을 정리했어요. "생산성을 높이는 5가지 습관" — 1) 아침 루틴 2) 딥워크 시간 확보 3) 할 일 3개만 4) 디지털 디톡스 5) 주간 회고.',
        delay: 1500,
        typingSpeed: 25,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-youtube-1',
          domain: 'knowledge',
          raw: '생산성을 높이는 5가지 습관',
          domain_data: {
            title: '생산성을 높이는 5가지 습관',
            description: '아침 루틴, 딥워크, 할 일 3개, 디지털 디톡스, 주간 회고',
            triples: [
              { subject: '생산성', predicate: 'requires', object: '아침 루틴' },
              { subject: '생산성', predicate: 'requires', object: '딥워크' },
              { subject: '생산성', predicate: 'requires', object: '디지털 디톡스' },
            ],
          },
        },
      },
      {
        type: 'view',
        delay: 400,
        view: {
          viewType: 'knowledge_graph',
          nodes: [{
            id: 'demo-youtube-1',
            domain: 'knowledge',
            raw: '생산성을 높이는 5가지 습관',
            domain_data: { title: '생산성 5가지 습관' },
            triples: [
              { subject: '생산성', predicate: 'requires', object: '아침 루틴' },
              { subject: '생산성', predicate: 'requires', object: '딥워크' },
              { subject: '생산성', predicate: 'requires', object: '디지털 디톡스' },
              { subject: '딥워크', predicate: 'causes', object: '집중력 향상' },
              { subject: '주간 회고', predicate: 'causes', object: '개선 루프' },
            ],
            created_at: new Date().toISOString(),
          }],
        },
      },
    ],
  },

  // ═══ 습관 ═══
  {
    scenarioId: 'habit-demo',
    steps: [
      {
        type: 'user',
        content: '오늘 러닝 30분 완료',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '러닝 기록했어요. 꾸준히 하고 있네요!',
        delay: 800,
        typingSpeed: 40,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-habit-1',
          domain: 'habit',
          raw: '러닝 30분',
          domain_data: {
            activity: '러닝',
            duration: 30,
            unit: '분',
            date: new Date().toISOString().split('T')[0],
          },
        },
      },
      {
        type: 'view',
        delay: 400,
        view: {
          viewType: 'heatmap',
          nodes: [{
            id: 'demo-habit-1',
            domain: 'habit',
            raw: '러닝 30분',
            domain_data: { activity: '러닝', duration: 30, date: new Date().toISOString().split('T')[0] },
            created_at: new Date().toISOString(),
          }],
        },
      },
    ],
  },

  // ═══ 사람 기록 ═══
  {
    scenarioId: 'relation-demo',
    steps: [
      {
        type: 'user',
        content: '희민이 생일 5월 3일, 대학 친구',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '희민님 정보 기억했어요. 생일 다가오면 알려드릴게요.',
        delay: 800,
        typingSpeed: 35,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-relation-1',
          domain: 'relation',
          raw: '희민이 생일 5월 3일, 대학 친구',
          domain_data: {
            name: '희민',
            birthday: '05-03',
            relationship: '대학 친구',
          },
        },
      },
      {
        type: 'view',
        delay: 400,
        view: {
          viewType: 'relationship',
          nodes: [{
            id: 'demo-relation-1',
            domain: 'relation',
            raw: '희민이 생일 5월 3일, 대학 친구',
            domain_data: { name: '희민', birthday: '05-03', relationship: '대학 친구' },
            created_at: new Date().toISOString(),
          }],
        },
      },
    ],
  },

  // ═══ 회의록 ═══
  {
    scenarioId: 'meeting-demo',
    steps: [
      {
        type: 'user',
        content: '마케팅 회의: 4월 캠페인 예산 500만원, 담당 수진, 마감 4월 25일',
        delay: 300,
      },
      {
        type: 'assistant',
        content: '회의 내용 정리했어요. 마감일도 캘린더에 넣었어요.',
        delay: 800,
        typingSpeed: 35,
      },
      {
        type: 'node',
        delay: 200,
        node: {
          id: 'demo-meeting-1',
          domain: 'task',
          raw: '4월 캠페인 예산 500만원, 담당 수진, 마감 4/25',
          domain_data: {
            title: '4월 캠페인',
            status: 'todo',
            priority: 'high',
            deadline: '4월 25일',
          },
        },
      },
      {
        type: 'view',
        delay: 400,
        view: {
          viewType: 'task',
          nodes: [
            { id: 'demo-meeting-1', domain: 'task', raw: '4월 캠페인 기획', domain_data: { title: '4월 캠페인 기획', status: 'todo', priority: 'high', deadline: '4월 25일' }, created_at: new Date().toISOString() },
            { id: 'demo-meeting-2', domain: 'task', raw: '예산 배분', domain_data: { title: '예산 배분 (500만원)', status: 'todo', priority: 'high' }, created_at: new Date().toISOString() },
            { id: 'demo-meeting-3', domain: 'task', raw: '수진 담당 배정', domain_data: { title: '수진 담당 배정', status: 'in_progress', priority: 'medium' }, created_at: new Date().toISOString() },
          ],
        },
      },
    ],
  },
];

export function getDemoByScenarioId(scenarioId: string): ScenarioDemo | undefined {
  return SCENARIO_DEMOS.find(d => d.scenarioId === scenarioId);
}
