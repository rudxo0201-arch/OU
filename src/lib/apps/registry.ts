/**
 * OU First-Party App Registry
 * 앱 추가 = 이 파일에 등록만. 다른 파일 수정 금지.
 *
 * 앱 = Orb. DataNode를 domain 필터로 읽어 뷰로 렌더링.
 * 홈 위젯은 앱의 미니뷰.
 */

export type AppInputType = 'record' | 'editor' | 'search' | 'none';

export interface AppDef {
  slug: string;            // URL: /app/{slug}
  label: string;           // 표시 이름: 'OU Calendar'
  domain: string;          // data_nodes.domain 필터
  icon: string;            // Phosphor icon name
  defaultView: string;     // VIEW_REGISTRY 키 (기본 뷰)
  alternateViews: string[]; // 전환 가능한 뷰 목록
  widgetTypes: string[];   // 연결된 홈 위젯 타입들
  route?: string;          // 기본: /app/{slug}. 오버라이드 시 설정.
  hasDetailRoute?: boolean; // /app/{slug}/{itemId} 사용 여부
  inputType?: AppInputType; // AI 입력 방식. 기본: 'none'
  inputPlaceholder?: string; // 입력창 placeholder
}

const APP_REGISTRY: AppDef[] = [
  // ── Tier 1: 이미 구축됨 ──
  {
    slug: 'note',
    label: 'OU Note',
    domain: 'note',
    icon: 'Note',
    defaultView: 'note',
    alternateViews: [],
    widgetTypes: ['quick-memo'],
    route: '/note/new',        // 기존 라우트 유지
    hasDetailRoute: false,
  },

  // ── Tier 2: App Shell만 필요 ──
  {
    slug: 'calendar',
    label: 'OU Calendar',
    domain: 'schedule',
    icon: 'CalendarBlank',
    defaultView: 'calendar',
    alternateViews: ['timeline', 'table'],
    widgetTypes: ['today-schedule', 'schedule-a', 'schedule-b', 'schedule-c', 'view-calendar'],
    hasDetailRoute: false,
    inputType: 'record',
    inputPlaceholder: '일정 추가... "내일 3시 팀 미팅"',
  },
  {
    slug: 'todo',
    label: 'OU Todo',
    domain: 'task',
    icon: 'CheckSquare',
    defaultView: 'todo',
    alternateViews: ['task', 'table'],
    widgetTypes: ['today-tasks', 'task-a', 'task-b', 'task-c', 'view-todo'],
    hasDetailRoute: false,
    inputType: 'record',
    inputPlaceholder: '할 일 추가... "과제 금요일까지"',
  },
  {
    slug: 'finance',
    label: 'OU Finance',
    domain: 'finance',
    icon: 'CurrencyKrw',
    defaultView: 'chart',
    alternateViews: ['table'],
    widgetTypes: ['finance-a', 'finance-b', 'finance-c', 'view-chart'],
    hasDetailRoute: false,
    inputType: 'record',
    inputPlaceholder: '지출 기록... "점심 김치찌개 9000원"',
  },
  {
    slug: 'habit',
    label: 'OU Habit',
    domain: 'habit',
    icon: 'Fire',
    defaultView: 'heatmap',
    alternateViews: ['table'],
    widgetTypes: ['habit-log', 'habit-a', 'habit-b', 'habit-c', 'view-heatmap'],
    hasDetailRoute: false,
    inputType: 'record',
    inputPlaceholder: '습관 기록... "오늘 명상 30분 완료"',
  },

  // ── Tier 3: 뷰 있음, 위젯 보강 필요 ──
  {
    slug: 'idea',
    label: 'OU Idea',
    domain: 'idea',
    icon: 'Lightbulb',
    defaultView: 'idea',
    alternateViews: ['timeline', 'table'],
    widgetTypes: ['idea-notes'],
    hasDetailRoute: true,
    inputType: 'record',
    inputPlaceholder: '아이디어 기록... "이런 기능 있으면 어떨까"',
  },
  {
    slug: 'people',
    label: 'OU People',
    domain: 'relation',
    icon: 'UsersThree',
    defaultView: 'profile',
    alternateViews: ['table'],
    widgetTypes: ['view-relation', 'view-profile'],
    hasDetailRoute: true,
  },

  // ── Tier 4: 나중에 ──
  {
    slug: 'health',
    label: 'OU Health',
    domain: 'health',
    icon: 'Heart',
    defaultView: 'journal',
    alternateViews: ['table'],
    widgetTypes: [],
    hasDetailRoute: false,
  },
  {
    slug: 'map',
    label: 'OU Map',
    domain: 'location',
    icon: 'MapPin',
    defaultView: 'map',
    alternateViews: ['table'],
    widgetTypes: ['view-map'],
    hasDetailRoute: false,
  },
  {
    slug: 'media',
    label: 'OU Media',
    domain: 'media',
    icon: 'Image',
    defaultView: 'scrap',
    alternateViews: ['table'],
    widgetTypes: [],
    hasDetailRoute: true,
  },
];

/** slug로 앱 조회 */
export function getAppDef(slug: string): AppDef | undefined {
  return APP_REGISTRY.find(a => a.slug === slug);
}

/** 위젯 타입으로 앱 조회 */
export function getAppByWidgetType(widgetType: string): AppDef | undefined {
  return APP_REGISTRY.find(a => a.widgetTypes.includes(widgetType));
}

/** 전체 앱 목록 */
export function getAllApps(): AppDef[] {
  return APP_REGISTRY;
}
