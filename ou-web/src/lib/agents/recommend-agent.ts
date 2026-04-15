/**
 * Recommendation Agent
 *
 * Analyzes a user's data_nodes to suggest the most useful DataViews.
 * Domain-neutral: works with any domain by counting patterns and detecting
 * repeated structures.
 */

interface DataNodeSummary {
  id: string;
  domain: string;
  source_type: string;
  view_hint: string | null;
  created_at: string;
}

export interface ViewRecommendation {
  viewType: string;
  reason: string;
  priority: number; // 1 = highest
  domain?: string;
  meta?: Record<string, unknown>;
}

/**
 * Pattern detectors: each analyzes nodes and may return a recommendation.
 */
type PatternDetector = (nodes: DataNodeSummary[]) => ViewRecommendation | null;

const detectors: PatternDetector[] = [
  // Many schedule nodes → calendar view
  (nodes) => {
    const scheduleNodes = nodes.filter((n) => n.domain === 'schedule');
    if (scheduleNodes.length >= 3) {
      return {
        viewType: 'calendar',
        reason: `일정 데이터가 ${scheduleNodes.length}개 있어요. 달력으로 보면 한눈에 파악할 수 있어요.`,
        priority: 1,
        domain: 'schedule',
        meta: { count: scheduleNodes.length },
      };
    }
    return null;
  },

  // Many finance nodes → chart view
  (nodes) => {
    const financeNodes = nodes.filter((n) => n.domain === 'finance');
    if (financeNodes.length >= 3) {
      return {
        viewType: 'chart',
        reason: `재무 데이터가 ${financeNodes.length}개 쌓였어요. 차트로 보면 흐름을 파악할 수 있어요.`,
        priority: 1,
        domain: 'finance',
        meta: { count: financeNodes.length },
      };
    }
    return null;
  },

  // Knowledge-heavy → graph view
  (nodes) => {
    const knowledgeNodes = nodes.filter((n) => n.domain === 'knowledge');
    if (knowledgeNodes.length >= 5) {
      return {
        viewType: 'graph',
        reason: `지식 데이터 ${knowledgeNodes.length}개가 연결되어 있어요. 그래프로 보면 관계를 탐색할 수 있어요.`,
        priority: 2,
        domain: 'knowledge',
        meta: { count: knowledgeNodes.length },
      };
    }
    return null;
  },

  // Many relation nodes → network view
  (nodes) => {
    const relationNodes = nodes.filter((n) => n.domain === 'relation');
    if (relationNodes.length >= 3) {
      return {
        viewType: 'network',
        reason: `인물 관계가 ${relationNodes.length}개 기록되어 있어요. 네트워크로 정리하면 좋겠어요.`,
        priority: 2,
        domain: 'relation',
        meta: { count: relationNodes.length },
      };
    }
    return null;
  },

  // Habit domain → streak/tracker view
  (nodes) => {
    const habitNodes = nodes.filter((n) => n.domain === 'habit');
    if (habitNodes.length >= 3) {
      return {
        viewType: 'tracker',
        reason: `습관 기록이 ${habitNodes.length}개 쌓였어요. 트래커로 꾸준함을 확인해보세요.`,
        priority: 2,
        domain: 'habit',
        meta: { count: habitNodes.length },
      };
    }
    return null;
  },

  // Task domain → kanban/list view
  (nodes) => {
    const taskNodes = nodes.filter((n) => n.domain === 'task');
    if (taskNodes.length >= 2) {
      return {
        viewType: 'kanban',
        reason: `할 일이 ${taskNodes.length}개 있어요. 보드로 관리하면 진행상황을 파악하기 좋아요.`,
        priority: 1,
        domain: 'task',
        meta: { count: taskNodes.length },
      };
    }
    return null;
  },

  // Diverse domains → dashboard view
  (nodes) => {
    const domainSet = new Set(nodes.map((n) => n.domain));
    if (domainSet.size >= 4 && nodes.length >= 10) {
      return {
        viewType: 'dashboard',
        reason: `${domainSet.size}개 영역에 걸쳐 데이터가 쌓이고 있어요. 대시보드로 전체를 조망해보세요.`,
        priority: 3,
        meta: { domains: Array.from(domainSet), totalNodes: nodes.length },
      };
    }
    return null;
  },

  // Many nodes from same source → table view
  (nodes) => {
    const sourceCount: Record<string, number> = {};
    for (const n of nodes) {
      sourceCount[n.source_type] = (sourceCount[n.source_type] ?? 0) + 1;
    }
    const topSource = Object.entries(sourceCount).sort(
      ([, a], [, b]) => b - a,
    )[0];
    if (topSource && topSource[1] >= 10) {
      return {
        viewType: 'table',
        reason: `${topSource[0]}에서 가져온 데이터가 ${topSource[1]}개 있어요. 테이블로 정리하면 빠르게 찾을 수 있어요.`,
        priority: 3,
        meta: { source: topSource[0], count: topSource[1] },
      };
    }
    return null;
  },

  // Recent burst of activity → timeline view
  (nodes) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentNodes = nodes.filter(
      (n) => new Date(n.created_at) >= oneWeekAgo,
    );
    if (recentNodes.length >= 10) {
      return {
        viewType: 'timeline',
        reason: `최근 일주일에 ${recentNodes.length}개 데이터가 생겼어요. 타임라인으로 흐름을 확인해보세요.`,
        priority: 2,
        meta: { recentCount: recentNodes.length },
      };
    }
    return null;
  },
];

/**
 * Analyze user's data_nodes and return view recommendations.
 * Sorted by priority (1 = most important).
 */
export function recommend(nodes: DataNodeSummary[]): ViewRecommendation[] {
  if (!nodes.length) return [];

  const recommendations: ViewRecommendation[] = [];

  for (const detect of detectors) {
    const result = detect(nodes);
    if (result) recommendations.push(result);
  }

  // Sort by priority ascending (1 = highest)
  recommendations.sort((a, b) => a.priority - b.priority);

  // Also add the most common view_hint if not already recommended
  const hintCount: Record<string, number> = {};
  for (const n of nodes) {
    if (n.view_hint) {
      hintCount[n.view_hint] = (hintCount[n.view_hint] ?? 0) + 1;
    }
  }
  const topHint = Object.entries(hintCount).sort(([, a], [, b]) => b - a)[0];
  if (
    topHint &&
    topHint[1] >= 3 &&
    !recommendations.find((r) => r.viewType === topHint[0])
  ) {
    recommendations.push({
      viewType: topHint[0],
      reason: `자주 사용하는 뷰 형식이에요. (${topHint[1]}회)`,
      priority: 4,
      meta: { hintCount: topHint[1] },
    });
  }

  return recommendations;
}

/**
 * Get domain distribution summary for analytics.
 */
export function getDomainSummary(
  nodes: DataNodeSummary[],
): Array<{ domain: string; count: number; percentage: number }> {
  const counts: Record<string, number> = {};
  for (const n of nodes) {
    counts[n.domain] = (counts[n.domain] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([domain, count]) => ({
      domain,
      count,
      percentage: Math.round((count / nodes.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
