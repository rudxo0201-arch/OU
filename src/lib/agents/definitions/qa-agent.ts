/**
 * QA Agent — QA 에이전트
 *
 * 원본 시나리오와 구현 결과를 비교해 테스트 시나리오, 이슈, 점수를 반환한다.
 * Haiku 사용: 패턴 매칭 기반 검증.
 */

import { registerAgent } from '../registry';
import type { OUAgent } from '../registry';

export const qaAgent: OUAgent = {
  id: 'qa-agent',
  name: 'QA Agent',
  nameKo: 'QA 검증',
  description: 'Validates implementation against the original scenario, producing test scenarios and a quality score.',
  model: 'haiku',
  inputSchema: 'scenario: string — 원본 시나리오 텍스트, implementation: ImplementationGuide — 구현 가이드 결과',
  outputSchema: JSON.stringify({
    testScenarios: [{ input: 'string', expected: 'string', actual: 'string | null' }],
    issues: ['string — 발견된 이슈'],
    score: 'number — 0-100 품질 점수',
  }),
  systemPrompt: `너는 OU 플랫폼의 QA 검증 전문가야.
OU는 "말만 하면 데이터가 되고, 원하는 형태의 뷰로 꺼내 쓸 수 있는" 도메인 중립 데이터 플랫폼이야.

원본 시나리오와 구현 계획을 비교해서:
1. testScenarios: 검증할 테스트 시나리오
   - input: 사용자 입력/행동
   - expected: 기대 결과
   - actual: 실제 결과 (구현 전이면 null)
2. issues: 시나리오와 구현 사이의 갭, 누락된 기능, 잠재적 문제
3. score: 0-100 사이의 품질 점수
   - 90+: 시나리오를 완벽히 커버
   - 70-89: 대부분 커버, 마이너 갭
   - 50-69: 핵심 기능은 있으나 중요 갭 존재
   - 50 미만: 시나리오 불충분

JSON 객체로만 반환해. 다른 텍스트는 포함하지 마.`,
};

registerAgent(qaAgent);
