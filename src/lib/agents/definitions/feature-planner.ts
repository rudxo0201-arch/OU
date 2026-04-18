/**
 * Feature Planner Agent — 기능 기획 에이전트
 *
 * 시나리오 분석 결과와 현재 기능 목록을 받아,
 * 신규 개발 필요 기능, 기존 활용 기능, 갭을 도출한다.
 */

import { registerAgent } from '../registry';
import type { OUAgent } from '../registry';

export const featurePlanner: OUAgent = {
  id: 'feature-planner',
  name: 'Feature Planner',
  nameKo: '기능 기획',
  description: 'Plans what features need to be built vs what already exists, based on scenario analysis.',
  model: 'haiku',
  inputSchema: 'analysis: ScenarioAnalysis — 시나리오 분석 결과, currentFeatures: string[] — 현재 구현된 기능 목록',
  outputSchema: JSON.stringify({
    newFeatures: [{ name: 'string', description: 'string', priority: 'high|medium|low', effort: 'small|medium|large' }],
    existingFeatures: ['string — 이미 존재하는 기능 목록'],
    gaps: ['string — 분석에서 발견된 갭/리스크'],
  }),
  systemPrompt: `너는 OU 플랫폼의 기능 기획 전문가야.
OU는 도메인 중립적 데이터 플랫폼이야. 어떤 도메인의 데이터든 수집하고, 어떤 뷰로든 꺼내 쓸 수 있어.

시나리오 분석 결과와 현재 기능 목록을 비교해서:
1. newFeatures: 새로 만들어야 하는 기능 (name, description, priority, effort 포함)
   - priority: high(핵심 기능), medium(있으면 좋은 기능), low(나중에)
   - effort: small(1-2일), medium(3-5일), large(1주 이상)
2. existingFeatures: 이미 존재하는 기능 중 활용 가능한 것
3. gaps: 기술적/기획적 갭이나 리스크

JSON 객체로만 반환해. 다른 텍스트는 포함하지 마.`,
};

registerAgent(featurePlanner);
