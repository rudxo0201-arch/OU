/**
 * 기능 해금 레지스트리
 * 모든 해금 가능한 기능을 여기에 등록
 * 새 기능 추가 = 이 배열에 항목 추가만
 */

export interface FeatureDefinition {
  /** 고유 ID (profiles.features_unlocked 배열에 저장) */
  id: string;
  /** 사용자에게 보여줄 이름 (한국어) */
  displayName: string;
  /** 해금 시 OU가 채팅에서 제안하는 문구 */
  unlockPrompt: string;
  /** 해금 완료 시 보여줄 문구 */
  unlockConfirm: string;
  /** 기본 해금 여부 (true면 처음부터 사용 가능) */
  defaultUnlocked: boolean;
  /** 해금 제안 조건: 사용자가 이 조건을 충족하면 제안 */
  triggerCondition: string;
  /** 기능 카테고리 */
  category: 'view' | 'tool' | 'social' | 'data';
}

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    id: 'highlight',
    displayName: '하이라이트',
    unlockPrompt: '읽으면서 중요한 부분 표시하고 싶지 않아요?',
    unlockConfirm: '이제 중요한 부분을 표시할 수 있어요!',
    defaultUnlocked: false,
    triggerCondition: 'document_view_opened_3_times',
    category: 'view',
  },
  {
    id: 'split_view',
    displayName: '나란히 보기',
    unlockPrompt: '다른 자료랑 나란히 보면 비교하기 편할 것 같아요',
    unlockConfirm: '이제 두 자료를 나란히 볼 수 있어요!',
    defaultUnlocked: false,
    triggerCondition: 'has_nodes_5_plus',
    category: 'view',
  },
  {
    id: 'quiz_gen',
    displayName: '퀴즈 만들기',
    unlockPrompt: '이걸로 퀴즈 만들어볼까요? 복습하기 좋아요',
    unlockConfirm: '퀴즈가 준비됐어요! 바로 풀어볼까요?',
    defaultUnlocked: false,
    triggerCondition: 'has_nodes_10_plus',
    category: 'tool',
  },
  {
    id: 'auto_link',
    displayName: '자동 연결',
    unlockPrompt: '비슷한 내용끼리 연결해드릴까요? 숨은 관계가 보일 거예요',
    unlockConfirm: '연결을 찾았어요! 그래프에서 확인해보세요',
    defaultUnlocked: false,
    triggerCondition: 'has_nodes_5_plus',
    category: 'data',
  },
  {
    id: 'daily_card',
    displayName: '매일 복습',
    unlockPrompt: '매일 하나씩 복습해볼까요? 기억에 오래 남아요',
    unlockConfirm: '내일 아침부터 복습 카드가 올 거예요!',
    defaultUnlocked: false,
    triggerCondition: 'has_nodes_10_plus',
    category: 'tool',
  },
  {
    id: 'chart_view',
    displayName: '차트로 보기',
    unlockPrompt: '이걸 차트로 보면 더 재밌을 것 같아요',
    unlockConfirm: '차트 뷰가 열렸어요!',
    defaultUnlocked: false,
    triggerCondition: 'has_table_data',
    category: 'view',
  },
  {
    id: 'share',
    displayName: '공유하기',
    unlockPrompt: '이거 다른 사람들도 관심 있어할 것 같아요. 공유해볼래요?',
    unlockConfirm: '이제 공유할 수 있어요!',
    defaultUnlocked: false,
    triggerCondition: 'has_nodes_10_plus',
    category: 'social',
  },
  {
    id: 'market_sell',
    displayName: '판매하기',
    unlockPrompt: '팔로워가 늘고 있어요. 유료로 전환해볼까요?',
    unlockConfirm: '마켓에 등록할 수 있어요!',
    defaultUnlocked: false,
    triggerCondition: 'has_followers_10_plus',
    category: 'social',
  },
];

/** ID로 기능 정의 조회 */
export function getFeatureById(id: string): FeatureDefinition | undefined {
  return FEATURE_REGISTRY.find(f => f.id === id);
}

/** 기본 해금 기능 ID 목록 */
export function getDefaultUnlockedIds(): string[] {
  return FEATURE_REGISTRY.filter(f => f.defaultUnlocked).map(f => f.id);
}

/** 유효한 기능 ID인지 확인 */
export function isValidFeatureId(id: string): boolean {
  return FEATURE_REGISTRY.some(f => f.id === id);
}
