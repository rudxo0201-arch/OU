import type { DataNodeDomain } from '@/types';

/**
 * 뷰 타입별 스키마 힌트
 * 각 뷰가 어떤 데이터 필드를 기대하는지 정의
 * 추천용이며 강제가 아님
 */
export interface ViewSchemaHint {
  viewType: string;
  label: string;
  description: string;
  icon: string;
  requiredFields: string[];
  optionalFields: string[];
  bestDomains: DataNodeDomain[];
  dataShape: 'single' | 'list' | 'timeseries' | 'relational' | 'hierarchical';
}

export const VIEW_SCHEMA_HINTS: ViewSchemaHint[] = [
  {
    viewType: 'calendar',
    label: '캘린더',
    description: '날짜가 있는 데이터를 달력으로',
    icon: 'CalendarBlank',
    requiredFields: ['date'],
    optionalFields: ['title', 'time', 'location', 'description'],
    bestDomains: ['schedule', 'task', 'habit'],
    dataShape: 'timeseries',
  },
  {
    viewType: 'task',
    label: '보드',
    description: '상태별로 분류하는 칸반 보드',
    icon: 'Kanban',
    requiredFields: ['status'],
    optionalFields: ['title', 'due', 'priority', 'assignee'],
    bestDomains: ['task'],
    dataShape: 'list',
  },
  {
    viewType: 'knowledge_graph',
    label: '그래프',
    description: '관계로 연결된 지식 네트워크',
    icon: 'Graph',
    requiredFields: ['title'],
    optionalFields: ['tags', 'references', 'confidence'],
    bestDomains: ['knowledge', 'idea'],
    dataShape: 'relational',
  },
  {
    viewType: 'chart',
    label: '차트',
    description: '숫자 데이터를 시각화',
    icon: 'ChartBar',
    requiredFields: ['amount', 'category'],
    optionalFields: ['date', 'label', 'description'],
    bestDomains: ['finance'],
    dataShape: 'list',
  },
  {
    viewType: 'mindmap',
    label: '마인드맵',
    description: '중심 주제에서 가지치기',
    icon: 'TreeStructure',
    requiredFields: ['title'],
    optionalFields: ['category', 'children', 'description'],
    bestDomains: ['idea', 'knowledge'],
    dataShape: 'hierarchical',
  },
  {
    viewType: 'heatmap',
    label: '히트맵',
    description: '활동 빈도를 색상으로',
    icon: 'SquaresFour',
    requiredFields: ['date'],
    optionalFields: ['frequency', 'value', 'streak'],
    bestDomains: ['habit'],
    dataShape: 'timeseries',
  },
  {
    viewType: 'journal',
    label: '일기',
    description: '날짜별 기록을 일기 형태로',
    icon: 'BookOpen',
    requiredFields: ['date'],
    optionalFields: ['mood', 'content', 'energy_level', 'triggers'],
    bestDomains: ['emotion'],
    dataShape: 'timeseries',
  },
  {
    viewType: 'timeline',
    label: '타임라인',
    description: '시간순으로 나열',
    icon: 'Clock',
    requiredFields: ['date'],
    optionalFields: ['title', 'description', 'category'],
    bestDomains: ['schedule', 'task', 'knowledge'],
    dataShape: 'timeseries',
  },
  {
    viewType: 'flashcard',
    label: '플래시카드',
    description: '질문-답변 형태로 학습',
    icon: 'Cards',
    requiredFields: ['question', 'answer'],
    optionalFields: ['hint', 'difficulty', 'tags'],
    bestDomains: ['knowledge'],
    dataShape: 'list',
  },
  {
    viewType: 'dictionary',
    label: '사전',
    description: '용어와 정의를 사전 형태로',
    icon: 'BookBookmark',
    requiredFields: ['term', 'definition'],
    optionalFields: ['pronunciation', 'examples', 'tags', 'category'],
    bestDomains: ['knowledge'],
    dataShape: 'list',
  },
  {
    viewType: 'document',
    label: '문서',
    description: '구조화된 문서 형태로 렌더링',
    icon: 'FileText',
    requiredFields: ['title'],
    optionalFields: ['sections', 'content', 'author', 'date'],
    bestDomains: ['knowledge', 'education'],
    dataShape: 'single',
  },
  {
    viewType: 'table',
    label: '표',
    description: '모든 데이터를 표 형태로',
    icon: 'Table',
    requiredFields: [],
    optionalFields: ['title', 'date', 'domain', 'status'],
    bestDomains: [],
    dataShape: 'list',
  },
  {
    viewType: 'pdf',
    label: 'PDF',
    description: '원본·텍스트·요약·목차·연결·인사이트 복합 뷰',
    icon: 'FilePdf',
    requiredFields: ['file_url'],
    optionalFields: ['extracted_text', 'summary', 'toc', 'headings', 'insights'],
    bestDomains: ['knowledge', 'education'],
    dataShape: 'single',
  },
  {
    viewType: 'lecture',
    label: '강의',
    description: '챕터 기반 강의 제작·열람',
    icon: 'Presentation',
    requiredFields: ['title'],
    optionalFields: ['content', 'video_url', 'image_url', 'order', 'question', 'answer'],
    bestDomains: ['education', 'knowledge'],
    dataShape: 'list',
  },
  {
    viewType: 'profile',
    label: '프로필',
    description: '회원 프로필과 공개 데이터',
    icon: 'User',
    requiredFields: [],
    optionalFields: ['display_name', 'handle', 'bio', 'avatar_url', 'personas'],
    bestDomains: [],
    dataShape: 'single',
  },
  {
    viewType: 'relationship',
    label: '관계',
    description: '사람 간의 관계를 시각화',
    icon: 'UsersThree',
    requiredFields: ['person_name'],
    optionalFields: ['relationship_type', 'contact', 'notes', 'last_contact'],
    bestDomains: ['relation'],
    dataShape: 'relational',
  },
  {
    viewType: 'health',
    label: '건강',
    description: '건강 데이터를 추적·시각화',
    icon: 'Heartbeat',
    requiredFields: ['date'],
    optionalFields: ['weight', 'blood_pressure', 'sleep', 'exercise', 'medication', 'symptoms'],
    bestDomains: ['habit'],
    dataShape: 'timeseries',
  },
  {
    viewType: 'resume',
    label: '이력서',
    description: '경력과 역량을 이력서 형태로',
    icon: 'IdentificationBadge',
    requiredFields: ['title'],
    optionalFields: ['company', 'period', 'description', 'skills', 'education'],
    bestDomains: ['education'],
    dataShape: 'list',
  },
  {
    viewType: 'snapshot',
    label: '스냅샷',
    description: '특정 시점의 데이터 상태를 캡처',
    icon: 'Camera',
    requiredFields: ['date'],
    optionalFields: ['title', 'description', 'metrics', 'tags'],
    bestDomains: [],
    dataShape: 'single',
  },
  {
    viewType: 'map',
    label: '지도',
    description: '약속 장소를 지도에 표시',
    icon: 'MapPin',
    requiredFields: ['location'],
    optionalFields: ['date', 'time', 'title', 'address'],
    bestDomains: ['schedule'],
    dataShape: 'list',
  },
  {
    viewType: 'dev_workspace',
    label: '개발 환경',
    description: '코드를 편집하고 AI와 개발하는 환경',
    icon: 'Code',
    requiredFields: ['project_name'],
    optionalFields: ['tech_stack', 'description'],
    bestDomains: ['development'],
    dataShape: 'hierarchical',
  },
];

/**
 * 노드 데이터 기반 뷰 타입 추천
 * score >= 50인 힌트만 반환, 점수순 정렬
 */
export function recommendViewTypes(
  nodes: Array<{ domain_data?: Record<string, unknown>; domain?: string }>,
): ViewSchemaHint[] {
  if (nodes.length === 0) return VIEW_SCHEMA_HINTS;

  // 노드들에서 실제 존재하는 domain_data 키 추출
  const fieldCounts = new Map<string, number>();
  const domainCounts = new Map<string, number>();

  for (const node of nodes) {
    if (node.domain) {
      domainCounts.set(node.domain, (domainCounts.get(node.domain) ?? 0) + 1);
    }
    if (node.domain_data && typeof node.domain_data === 'object') {
      for (const key of Object.keys(node.domain_data)) {
        fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const total = nodes.length;

  const scored = VIEW_SCHEMA_HINTS.map(hint => {
    // requiredFields 매칭 (70점)
    const reqMatched = hint.requiredFields.length === 0
      ? 1
      : hint.requiredFields.filter(f => fieldCounts.has(f)).length / hint.requiredFields.length;

    // optionalFields 매칭 (20점)
    const optMatched = hint.optionalFields.length === 0
      ? 0.5
      : hint.optionalFields.filter(f => fieldCounts.has(f)).length / hint.optionalFields.length;

    // 도메인 매칭 (10점)
    const domainMatch = hint.bestDomains.length === 0
      ? 0.5
      : hint.bestDomains.some(d => domainCounts.has(d)) ? 1 : 0;

    const score = reqMatched * 70 + optMatched * 20 + domainMatch * 10;
    return { hint, score };
  });

  return scored
    .filter(s => s.score >= 50)
    .sort((a, b) => b.score - a.score)
    .map(s => s.hint);
}

/**
 * 특정 뷰 타입의 스키마 힌트 조회
 */
export function getSchemaHint(viewType: string): ViewSchemaHint | undefined {
  return VIEW_SCHEMA_HINTS.find(h => h.viewType === viewType);
}

/**
 * 노드들에서 domain_data 필드별 커버리지(%) 계산
 */
export function calculateFieldCoverage(
  nodes: Array<{ domain_data?: Record<string, unknown> }>,
  fields: string[],
): Record<string, number> {
  if (nodes.length === 0) return Object.fromEntries(fields.map(f => [f, 0]));

  const counts = new Map<string, number>();
  for (const node of nodes) {
    if (node.domain_data && typeof node.domain_data === 'object') {
      for (const key of Object.keys(node.domain_data)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  return Object.fromEntries(
    fields.map(f => [f, Math.round(((counts.get(f) ?? 0) / nodes.length) * 100)])
  );
}
