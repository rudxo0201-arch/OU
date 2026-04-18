import type { UXFlowData } from '@/types/admin';

/**
 * OU 실제 라우트 기반 기본 UX 플로우 다이어그램
 */
export const DEFAULT_UX_FLOW: UXFlowData = {
  nodes: [
    // Public pages
    { id: 'landing', type: 'page', label: '랜딩페이지', route: '/', position: { x: 0, y: 0 }, description: '서비스 소개, Just talk.' },
    { id: 'universe', type: 'page', label: '홈 (비로그인)', route: '/universe', position: { x: 250, y: 0 }, description: '공개 데이터 탐색' },
    { id: 'login', type: 'page', label: '로그인', route: '/login', position: { x: 500, y: 0 }, description: 'Supabase Auth' },

    // Private pages
    { id: 'my', type: 'page', label: '홈 (로그인)', route: '/my', position: { x: 250, y: 200 }, description: '개인 데이터 대시보드' },
    { id: 'chat', type: 'page', label: 'OU-Chat', route: '/chat', position: { x: 0, y: 200 }, description: '대화 → 데이터 생성' },
    { id: 'accuracy', type: 'page', label: '정확도 높이기', route: '/accuracy', position: { x: 500, y: 200 }, description: '미확인 항목 해결' },
    { id: 'feed', type: 'page', label: 'SNS 채널', route: '/feed', position: { x: 0, y: 400 }, description: '페르소나 기반 피드' },
    { id: 'messages', type: 'page', label: 'OU 채팅', route: '/messages', position: { x: 250, y: 400 }, description: '1:1, 그룹 채팅' },
    { id: 'admin', type: 'page', label: '관리자 패널', route: '/admin', position: { x: 500, y: 400 }, description: '전체 서비스 관리' },
    { id: 'settings', type: 'page', label: '설정', route: '/settings', position: { x: 750, y: 200 }, description: '계정, 알림 설정' },
    { id: 'market', type: 'page', label: '마켓', route: '/market', position: { x: 750, y: 400 }, description: '뷰 템플릿 거래' },

    // Key components
    { id: 'graph_view', type: 'component', label: '그래프뷰', position: { x: 250, y: 600 }, description: '별과 중력의 데이터 시각화' },
    { id: 'data_views', type: 'component', label: '데이터뷰', position: { x: 500, y: 600 }, description: '캘린더, 칸반, 마인드맵 등' },

    // Modals
    { id: 'view_picker', type: 'modal', label: '뷰 선택', position: { x: 0, y: 600 }, description: '뷰 타입 선택 모달' },
    { id: 'node_detail', type: 'modal', label: '데이터 상세', position: { x: 750, y: 600 }, description: '노드 상세 보기/편집' },
  ],
  edges: [
    // Navigation
    { id: 'e1', source: 'landing', target: 'universe', type: 'navigate', label: '둘러보기' },
    { id: 'e2', source: 'landing', target: 'login', type: 'navigate', label: '로그인' },
    { id: 'e3', source: 'login', target: 'my', type: 'navigate', label: '인증 성공' },
    { id: 'e4', source: 'my', target: 'chat', type: 'navigate', label: '대화하기' },
    { id: 'e5', source: 'my', target: 'accuracy', type: 'navigate', label: '확인하기' },
    { id: 'e6', source: 'my', target: 'feed', type: 'navigate', label: 'SNS' },
    { id: 'e7', source: 'my', target: 'messages', type: 'navigate', label: '채팅' },
    { id: 'e8', source: 'my', target: 'settings', type: 'navigate', label: '설정' },
    { id: 'e9', source: 'my', target: 'admin', type: 'navigate', label: '관리 (admin)' },
    { id: 'e10', source: 'my', target: 'market', type: 'navigate', label: '마켓' },

    // Data flow
    { id: 'e11', source: 'chat', target: 'my', type: 'data', label: 'DataNode 생성' },
    { id: 'e12', source: 'my', target: 'graph_view', type: 'data', label: '노드 렌더링' },
    { id: 'e13', source: 'my', target: 'data_views', type: 'data', label: '뷰 렌더링' },

    // Hover/modal
    { id: 'e14', source: 'my', target: 'view_picker', type: 'hover', label: '뷰 변경' },
    { id: 'e15', source: 'graph_view', target: 'node_detail', type: 'hover', label: '노드 클릭' },
    { id: 'e16', source: 'data_views', target: 'node_detail', type: 'hover', label: '항목 클릭' },
  ],
};
