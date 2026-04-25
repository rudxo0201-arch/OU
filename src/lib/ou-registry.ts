/**
 * OU 핵심 식별자 + 용어 단일 정의 (SSOT).
 *
 * 이 파일이 OU의 유일한 용어·식별자 원본이다.
 * CLAUDE.md §4의 용어표, §3의 도메인 목록, §8의 라우트 목록은
 * 모두 이 파일에서 파생된다 — 이 파일이 이긴다.
 *
 * 규칙:
 * 1. 이름/용어를 변경할 때 이 파일만 수정 → TypeScript가 모든 사용처를 찾아준다.
 * 2. DB에 저장되는 식별자(위젯 타입, 도메인)를 변경할 때는
 *    src/components/widgets/registry.ts 의 WIDGET_TYPE_MIGRATIONS도 함께 업데이트.
 * 3. 새 식별자·용어를 추가할 때 이 파일에 먼저 정의한 후 사용.
 *    코드에 매직 스트링 직접 사용 금지.
 */

export const WIDGET_TYPES = {
  INPUT_BAR:  'oullm',
  SCHEDULE:   'today-schedule',
  TASKS:      'today-tasks',
  CLOCK:      'clock',
  STREAK:     'streak',
  HABIT:      'habit-tracker',
  FINANCE:    'finance',
  NOTE:       'note',
  IDEA:       'idea',
  HEATMAP:    'chat-heatmap',
  MEMO:       'quick-memo',
  SUMMARY:    'today-summary',
  RECENT:     'recent-nodes',
  VIEW:       'view',
  DICTIONARY: 'dictionary',
  BONCHO:     'boncho',
  API_TOKEN:  'api-token',
} as const;

export const ROUTES = {
  HOME:     '/home',
  LOGIN:    '/login',
  ROOT:     '/',
  SETTINGS: '/settings',
  DS:       '/ds',
  ORB:      (slug: string) => `/orb/${slug}`,
} as const;

export const ORB_SLUGS = {
  DEEP_TALK: 'deep-talk',
  SCHEDULE:  'schedule',
  TASK:      'task',
  HABIT:     'habit',
  IDEA:      'idea',
  NOTE:      'note',
  SETTINGS:  'settings',
} as const;

// ─────────────────────────────────────────────
// 도메인 식별자 — DB의 domain 필드값과 1:1 대응
// CLAUDE.md §3·§4 기준
// ─────────────────────────────────────────────

/** Phase 1 도메인 4개 + 확장 예정 도메인 */
export const DOMAINS = {
  // Phase 1
  SCHEDULE: 'schedule',
  TASK:     'task',
  HABIT:    'habit',
  JOURNAL:  'journal',
  // Phase 1+ (노트 Orb)
  NOTE:     'note',
  // Stealth — 사용자에게 노출하지 않음 (CLAUDE.md §5)
  EMOTION:  'emotion',
  // Phase 2+ 후보
  IDEA:        'idea',
  FINANCE:     'finance',
  RELATION:    'relation',
  MEDIA:       'media',
  LOCATION:    'location',
  HEALTH:      'health',
  STUDY:       'study',
  // 전문 도메인
  KNOWLEDGE:   'knowledge',
  DEVELOPMENT: 'development',
  EDUCATION:   'education',
  // 미디어 전용
  YOUTUBE:     'youtube',
  FILE:        'file',
} as const;

export type Domain = typeof DOMAINS[keyof typeof DOMAINS];

// ─────────────────────────────────────────────
// OU 핵심 용어 — UI 레이블, 코드 주석, 문서에서 동일하게 사용
// 이 상수를 쓰면 용어 재정의 시 전파가 자동화된다
// ─────────────────────────────────────────────

/**
 * OU 핵심 용어 정의.
 * aliases: 사용자가 대화 중 사용할 수 있는 동의어·유의어·구 용어.
 *   → Claude가 이 목록을 보고 "같은 개념"임을 인식한다.
 *   → aliases에 있는 표현이 나오면 새 개념으로 추가하지 말고 canonical로 매핑한다.
 */
export const TERMS = {
  ITEM: {
    canonical: 'Item',
    label_ko: '아이템',
    description: '의미 단위로 구조화된 데이터 1개. 일정·할일·습관·일기·노트 모두 Item이다.',
    aliases: ['노드', '데이터노드', 'DataNode', 'data node', '항목', '카드', 'node', '데이터', '단위'],
    deprecated: ['DataNode', 'data_node', 'Node'],
  },
  DOMAIN: {
    canonical: 'domain',
    label_ko: '도메인',
    description: 'Item의 종류 분류 필드. schedule · task · habit · journal 등.',
    aliases: ['타입', 'type', '종류', '카테고리', 'category'],
    deprecated: [],
  },
  ORB: {
    canonical: 'Orb',
    label_ko: 'Orb',
    description: '여러 모듈을 조합한 미니앱. OU 백엔드 공유, 1+ 페이지 가능.',
    aliases: ['앱', '미니앱', '채팅창', '오브', 'app', 'mini-app'],
    deprecated: [],
  },
  MODULE: {
    canonical: '모듈',
    label_ko: '모듈',
    description: '원자적 프론트엔드 컴포넌트 (Input / Display / Logic).',
    aliases: ['위젯', 'widget', '컴포넌트', 'component'],
    deprecated: ['widget'],
  },
  VIEW: {
    canonical: '뷰',
    label_ko: '뷰',
    description: 'Item을 특정 시각화로 렌더링한 결과. registry.ts 카탈로그에서 선택.',
    aliases: ['데이터뷰', '뷰 템플릿', 'view', '화면', '시각화'],
    deprecated: ['데이터뷰'],
  },
  MEMBER: {
    canonical: '회원',
    label_ko: '회원',
    description: 'OU에 데이터 우주를 쌓는 주체. 개인이든 회사든 동격.',
    aliases: ['유저', 'user', '사용자', '유저', '멤버', 'member'],
    deprecated: ['유저', 'user'],
  },
  GRAPH_VIEW: {
    canonical: '그래프뷰',
    label_ko: '그래프뷰',
    description: 'Item을 노드·엣지로 시각화하는 뷰. 우주 = 풀스크린 그래프뷰.',
    aliases: ['우주', '유니버스', 'universe', 'knowledge graph', '지식 그래프', 'graph'],
    deprecated: ['/universe', '/my'],
  },

  // 도메인 한국어 레이블 (UI 표시용)
  DOMAIN_LABELS: {
    schedule: '일정',
    task:     '할일',
    habit:    '습관',
    journal:  '일기',
    note:     '노트',
    idea:     '아이디어',
    finance:  '지출',
    relation: '인물',
    media:    '미디어',
    location: '장소',
    health:   '건강',
    study:    '학습',
    emotion:  '감정',
  },
} as const;

/**
 * alias → canonical 역방향 조회 맵.
 * 사용자가 aliases 목록의 단어를 쓰면 어떤 OU 개념인지 즉시 파악할 수 있다.
 */
export const TERM_ALIAS_MAP: Record<string, string> = Object.fromEntries(
  (Object.values(TERMS) as Array<{ canonical: string; aliases?: readonly string[] }>)
    .filter(t => t.aliases)
    .flatMap(t => (t.aliases ?? []).map(alias => [alias.toLowerCase(), t.canonical]))
);
