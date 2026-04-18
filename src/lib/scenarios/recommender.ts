/**
 * 데이터 패턴 기반 시나리오 추천
 * 사용자가 아직 안 써본 기능을 추천
 */

import { SCENARIOS, type Scenario } from '@/data/scenarios';

interface NodeSummary {
  domain: string;
  hasLocation?: boolean;
}

export function recommendScenarios(
  nodes: NodeSummary[],
  completedScenarioIds: string[],
  stage: 'guest' | 'onboarding' | 'active',
): Scenario[] {
  const completed = new Set(completedScenarioIds);

  // 도메인별 카운트
  const domainCounts: Record<string, number> = {};
  let locationCount = 0;
  for (const n of nodes) {
    domainCounts[n.domain] = (domainCounts[n.domain] ?? 0) + 1;
    if (n.hasLocation) locationCount++;
  }

  // stage별 후보
  const candidates = SCENARIOS.filter(s => s.stage === stage && !completed.has(s.id));

  if (stage === 'guest') {
    // 비로그인: 전부 노출
    return candidates;
  }

  if (stage === 'onboarding') {
    // 가입 직후: 아직 사용 안 한 도메인의 시나리오
    return candidates.filter(s => !domainCounts[s.domain]);
  }

  // active: 데이터 패턴 기반 추천
  const recommendations: Scenario[] = [];

  for (const s of candidates) {
    // 일정 5개 + location 있으면 지도 추천
    if (s.id === 'meeting-active' && (domainCounts['task'] ?? 0) >= 3) {
      recommendations.push(s);
      continue;
    }

    // 지출 5건 이상이면 선물 기록 추천
    if (s.id === 'gift-active' && (domainCounts['finance'] ?? 0) >= 5) {
      recommendations.push(s);
      continue;
    }

    // 지식 3건 이상이면 독서 메모 추천
    if (s.id === 'reading-active' && (domainCounts['knowledge'] ?? 0) >= 3) {
      recommendations.push(s);
      continue;
    }

    // 아이디어: 아이디어 도메인이 1건 이상이면
    if (s.id === 'idea-active' && (domainCounts['idea'] ?? 0) >= 1) {
      recommendations.push(s);
      continue;
    }
  }

  return recommendations.slice(0, 3); // 최대 3개
}
