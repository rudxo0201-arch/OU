/**
 * OU Design System — Component Registry (SSOT)
 *
 * 신규 컴포넌트 등록 절차: src/components/ds/GOVERNANCE.md 참조.
 *
 * 이 파일은 메타데이터만 담는다 — JSX/example 없음.
 * Example은 src/components/ds/_examples/<Name>.tsx 에 컴포넌트별 분리.
 *
 * id는 안정 식별자 (Phase 3 instance 추적 키). 한번 정해지면 변경 금지.
 */

export type DsGroup =
  | 'identity'
  | 'action'
  | 'input'
  | 'selection'
  | 'feedback'
  | 'display'
  | 'navigation'
  | 'layout'
  | 'overlay';

export type DsStatus = 'stable' | 'experimental' | 'deprecated';

export interface DsComponentMeta {
  id: string;
  name: string;
  group: DsGroup;
  description: string;
  variants?: string[];
  sizes?: string[];
  status: DsStatus;
  importPath: '@/components/ds';
}

export const DS_GROUP_LABELS: Record<DsGroup, string> = {
  identity:   'Identity',
  action:     'Action',
  input:      'Input',
  selection:  'Selection',
  feedback:   'Feedback',
  display:    'Display',
  navigation: 'Navigation',
  layout:     'Layout',
  overlay:    'Overlay',
};

export const DS_GROUPS: DsGroup[] = [
  'identity', 'action', 'input', 'selection',
  'feedback', 'display', 'navigation', 'layout', 'overlay',
];

export const DS_COMPONENTS: DsComponentMeta[] = [
  // ── Identity ────────────────────────────────────────────────────────────
  {
    id: 'OuLogo',
    name: 'OuLogo',
    group: 'identity',
    description: 'OU 브랜드 로고 (Orbitron 폰트). light/dark variant.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuAvatar',
    name: 'OuAvatar',
    group: 'identity',
    description: '사용자 아바타. src(이미지) > name(이니셜 자동 생성) 우선순위.',
    sizes: ['size: number (기본 36)'],
    status: 'stable',
    importPath: '@/components/ds',
  },

  // ── Action ──────────────────────────────────────────────────────────────
  {
    id: 'OuButton',
    name: 'OuButton',
    group: 'action',
    description: '기본 버튼. loading·fullWidth 지원.',
    variants: ['default', 'accent', 'ghost', 'danger'],
    sizes: ['sm', 'md', 'lg'],
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuIconButton',
    name: 'OuIconButton',
    group: 'action',
    description: '아이콘 전용 버튼. aria-label 필수. inline <button> 18건 대체.',
    variants: ['ghost', 'solid'],
    sizes: ['sm', 'md'],
    status: 'stable',
    importPath: '@/components/ds',
  },

  // ── Input ────────────────────────────────────────────────────────────────
  {
    id: 'OuInput',
    name: 'OuInput',
    group: 'input',
    description: '텍스트 입력. label, error, prefix/suffix 지원.',
    sizes: ['sm', 'md', 'lg'],
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuTextarea',
    name: 'OuTextarea',
    group: 'input',
    description: '멀티라인 텍스트 입력. label, error 지원.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuSearchBar',
    name: 'OuSearchBar',
    group: 'input',
    description: '검색 입력바. icon/trailing slot 지원.',
    status: 'stable',
    importPath: '@/components/ds',
  },

  // ── Selection ────────────────────────────────────────────────────────────
  {
    id: 'OuCheckbox',
    name: 'OuCheckbox',
    group: 'selection',
    description: '체크박스. controlled — checked + onChange 필수.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuToggle',
    name: 'OuToggle',
    group: 'selection',
    description: '토글 스위치. controlled — checked + onChange 필수.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuSelect',
    name: 'OuSelect',
    group: 'selection',
    description: '드롭다운 선택. controlled — value + onChange 필수.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuSlider',
    name: 'OuSlider',
    group: 'selection',
    description: '슬라이더. value 0–100. controlled.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuTabs',
    name: 'OuTabs',
    group: 'selection',
    description: '탭 네비게이션. tabs: { key, label }[]. controlled — activeKey + onChange 필수.',
    status: 'stable',
    importPath: '@/components/ds',
  },

  // ── Feedback ─────────────────────────────────────────────────────────────
  {
    id: 'OuToast',
    name: 'OuToast (ToastProvider + useToast)',
    group: 'feedback',
    description: '전역 토스트 알림. 앱 루트에 <ToastProvider>. useToast() 훅으로 표시.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuProgress',
    name: 'OuProgress',
    group: 'feedback',
    description: '진행률 바. value 0–100. showLabel 지원.',
    sizes: ['sm', 'md', 'lg'],
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuSkeleton',
    name: 'OuSkeleton',
    group: 'feedback',
    description: '로딩 스켈레톤. width, height로 크기 지정.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuNotificationBadge',
    name: 'OuNotificationBadge',
    group: 'feedback',
    description: '알림 카운트 뱃지. 부모에 position: relative 필요.',
    status: 'stable',
    importPath: '@/components/ds',
  },

  // ── Display ──────────────────────────────────────────────────────────────
  {
    id: 'OuFolderTree',
    name: 'OuFolderTree',
    group: 'display',
    description: 'D3 cluster 기반 수평 dendrogram. 흰 원형 노드 + Bezier 곡선. originPoint 지정 시 0.5s 펼침 애니메이션.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuOrbIcon',
    name: 'OuOrbIcon',
    group: 'display',
    description: '원형 Orb 아이콘. filled(흰 원+검은 아이콘) / outline(투명+흰 테두리+흰 아이콘) variant. 프리셋 레일·Orb바·트리 노드 공용.',
    variants: ['filled', 'outline'],
    sizes: ['28', '32', '40'],
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuCard',
    name: 'OuCard',
    group: 'display',
    description: '컨테이너 카드. floating/glass/white/pill/ghost variant.',
    variants: ['floating', 'glass', 'white', 'pill', 'ghost'],
    sizes: ['sm', 'md', 'lg'],
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuBadge',
    name: 'OuBadge',
    group: 'display',
    description: '상태·도메인 레이블 뱃지. accent prop으로 강조.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuTag',
    name: 'OuTag',
    group: 'display',
    description: '도메인 레이블 칩. 소형 텍스트 레이블.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuCircleDisplay',
    name: 'OuCircleDisplay',
    group: 'display',
    description: '원형 수치 표시. value(ReactNode) + label.',
    sizes: ['sm', 'md', 'lg'],
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuSectionTitle',
    name: 'OuSectionTitle',
    group: 'display',
    description: '섹션 구분 타이틀 (대문자 + 구분선).',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuDivider',
    name: 'OuDivider',
    group: 'display',
    description: '구분선. vertical prop으로 세로 전환.',
    status: 'stable',
    importPath: '@/components/ds',
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  {
    id: 'OuNavItem',
    name: 'OuNavItem',
    group: 'navigation',
    description: '사이드바·탭 내비게이션 항목. icon + children. active 상태.',
    status: 'stable',
    importPath: '@/components/ds',
  },

  // ── Layout ────────────────────────────────────────────────────────────────
  {
    id: 'AmbientBackground',
    name: 'AmbientBackground',
    group: 'layout',
    description: '화면 전체 앰비언트 배경 효과.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuPageLayout',
    name: 'OuPageLayout',
    group: 'layout',
    description: '일반 페이지 레이아웃 래퍼.',
    status: 'stable',
    importPath: '@/components/ds',
  },
  {
    id: 'OuAuthLayout',
    name: 'OuAuthLayout',
    group: 'layout',
    description: '인증 페이지 레이아웃 래퍼.',
    status: 'stable',
    importPath: '@/components/ds',
  },

  // ── Overlay ───────────────────────────────────────────────────────────────
  {
    id: 'OuModal',
    name: 'OuModal',
    group: 'overlay',
    description: '모달 다이얼로그. isOpen + onClose 필수. portal 렌더.',
    status: 'stable',
    importPath: '@/components/ds',
  },

  // ── Deprecated ────────────────────────────────────────────────────────────
  {
    id: 'AuthLayout',
    name: 'AuthLayout',
    group: 'layout',
    description: '(deprecated) 구 인증 페이지 레이아웃. OuAuthLayout으로 대체됨.',
    status: 'deprecated',
    importPath: '@/components/ds',
  },
  {
    id: 'PageLayout',
    name: 'PageLayout',
    group: 'layout',
    description: '(deprecated) 구 페이지 레이아웃 래퍼. OuPageLayout으로 대체됨.',
    status: 'deprecated',
    importPath: '@/components/ds',
  },

  // ── Input (Orb 전용 모듈) ─────────────────────────────────────────────────
  {
    id: 'OrbChat',
    name: 'OrbChat',
    group: 'input',
    description: 'Orb 채팅 입력 모듈. deep-talk Orb 전용.',
    status: 'experimental',
    importPath: '@/components/ds',
  },
  {
    id: 'OrbPost',
    name: 'OrbPost',
    group: 'input',
    description: 'Orb 포스트 입력 모듈.',
    status: 'experimental',
    importPath: '@/components/ds',
  },
  {
    id: 'OrbSearch',
    name: 'OrbSearch',
    group: 'input',
    description: 'Orb 검색 입력 모듈.',
    status: 'experimental',
    importPath: '@/components/ds',
  },
  {
    id: 'OrbQuick',
    name: 'OrbQuick',
    group: 'input',
    description: 'Orb 빠른 입력 모듈.',
    status: 'experimental',
    importPath: '@/components/ds',
  },
  {
    id: 'OrbComment',
    name: 'OrbComment',
    group: 'input',
    description: 'Orb 댓글 입력 모듈.',
    status: 'experimental',
    importPath: '@/components/ds',
  },
];

export const DS_COMPONENTS_MAP = new Map<string, DsComponentMeta>(
  DS_COMPONENTS.map(c => [c.id, c])
);
