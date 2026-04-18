/**
 * Universe Rank System
 * Stardust → Asteroid → Planet → Solar System → Nebula → Galaxy → Galaxy Cluster → Universe
 *
 * Rank is determined by total node count. No demotion: track highest achieved.
 */

export interface Rank {
  id: string;
  /** 한국어 이름 */
  name: string;
  /** 영문 이름 */
  nameEn: string;
  /** 최소 노드 수 */
  minNodes: number;
  /** 다음 등급 최소 노드 수 (Universe는 null) */
  nextMinNodes: number | null;
  /** 짧은 설명 */
  description: string;
  /** 이모지 아이콘 (Phosphor 아이콘은 컴포넌트에서 매핑) */
  emoji: string;
}

const RANKS: Rank[] = [
  {
    id: 'stardust',
    name: '별먼지',
    nameEn: 'Stardust',
    minNodes: 0,
    nextMinNodes: 10,
    description: '우주의 시작, 작은 먼지가 모이는 중',
    emoji: '✦',
  },
  {
    id: 'asteroid',
    name: '소행성',
    nameEn: 'Asteroid',
    minNodes: 10,
    nextMinNodes: 30,
    description: '조금씩 형태가 잡히고 있어요',
    emoji: '🪨',
  },
  {
    id: 'planet',
    name: '행성',
    nameEn: 'Planet',
    minNodes: 30,
    nextMinNodes: 100,
    description: '하나의 세계가 만들어지고 있어요',
    emoji: '🪐',
  },
  {
    id: 'solar-system',
    name: '태양계',
    nameEn: 'Solar System',
    minNodes: 100,
    nextMinNodes: 300,
    description: '여러 세계가 궤도를 이루고 있어요',
    emoji: '☀️',
  },
  {
    id: 'nebula',
    name: '성운',
    nameEn: 'Nebula',
    minNodes: 300,
    nextMinNodes: 1000,
    description: '지식의 구름이 빛나고 있어요',
    emoji: '🌌',
  },
  {
    id: 'galaxy',
    name: '은하',
    nameEn: 'Galaxy',
    minNodes: 1000,
    nextMinNodes: 3000,
    description: '수천 개의 별이 모인 거대한 은하',
    emoji: '🌀',
  },
  {
    id: 'galaxy-cluster',
    name: '은하단',
    nameEn: 'Galaxy Cluster',
    minNodes: 3000,
    nextMinNodes: 10000,
    description: '은하들이 모여 하나의 군집을 이뤄요',
    emoji: '💫',
  },
  {
    id: 'universe',
    name: '우주',
    nameEn: 'Universe',
    minNodes: 10000,
    nextMinNodes: null,
    description: '당신만의 우주가 완성되었어요',
    emoji: '🌠',
  },
];

/**
 * 현재 노드 수로 등급을 반환합니다.
 * highestNodeCount를 넘기면 "강등 방지"를 적용합니다.
 */
export function getUserRank(nodeCount: number, highestNodeCount?: number): Rank {
  const effectiveCount = Math.max(nodeCount, highestNodeCount ?? 0);

  let result = RANKS[0];
  for (const rank of RANKS) {
    if (effectiveCount >= rank.minNodes) {
      result = rank;
    }
  }
  return result;
}

/**
 * 다음 등급까지의 진행률 (0~100).
 * 최고 등급이면 100.
 */
export function getRankProgress(nodeCount: number): number {
  const rank = getUserRank(nodeCount);
  if (rank.nextMinNodes === null) return 100;

  const range = rank.nextMinNodes - rank.minNodes;
  const current = nodeCount - rank.minNodes;
  return Math.min(Math.round((current / range) * 100), 100);
}

/**
 * 다음 등급까지 필요한 노드 수.
 * 최고 등급이면 0.
 */
export function getNodesUntilNextRank(nodeCount: number): number {
  const rank = getUserRank(nodeCount);
  if (rank.nextMinNodes === null) return 0;
  return Math.max(rank.nextMinNodes - nodeCount, 0);
}

export function getAllRanks(): Rank[] {
  return [...RANKS];
}
