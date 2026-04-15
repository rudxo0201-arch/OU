// 도메인 타입 (DATA_STANDARD.md 불변)
export type DataNodeDomain =
  | 'schedule' | 'task' | 'habit' | 'knowledge'
  | 'idea' | 'relation' | 'emotion' | 'finance'
  | 'product' | 'broadcast' | 'education'
  | 'media' | 'location' | 'unresolved';

// 표준 서술어 (절대 추가/변경 금지)
export type TriplePredicate =
  | 'is_a' | 'part_of' | 'causes' | 'derived_from'
  | 'related_to' | 'opposite_of' | 'requires'
  | 'example_of' | 'involves' | 'located_at' | 'occurs_at';

export type Confidence = 'high' | 'medium' | 'low';
export type Visibility = 'private' | 'link' | 'public';
export type StorageTier = 'hot' | 'warm' | 'cold';
export type UserLevel = 'unknown' | 'basic' | 'intermediate' | 'expert';

// 그래프뷰 노드 시각 타입
// planet: 일반 DataNode (채워진 원)
// star: 중요 DataNode (별 모양)
// view: DataView 노드 (빈 링 + 아이콘, 일반 노드보다 큼)
export type GraphNodeType = 'planet' | 'star' | 'view';

// 구독 플랜
export type SubscriptionPlan = 'free' | 'pro' | 'team';
