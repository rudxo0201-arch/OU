/**
 * Implementation Advisor Agent — 구현 가이드 에이전트
 *
 * 기술 설계서와 코드베이스 컨텍스트를 받아 구체적인 구현 가이드를 생성한다.
 * Sonnet 사용: 코드 수준의 추론 필요.
 */

import { registerAgent } from '../registry';
import type { OUAgent } from '../registry';

export const implementationAdvisor: OUAgent = {
  id: 'implementation-advisor',
  name: 'Implementation Advisor',
  nameKo: '구현 가이드',
  description: 'Suggests specific code changes, file paths, and implementation steps from a technical spec.',
  model: 'sonnet',
  inputSchema: 'spec: TechnicalSpec — 기술 설계서, codebaseContext: string — 현재 코드베이스 요약',
  outputSchema: JSON.stringify({
    files: [{ path: 'string', changes: 'string — 변경/생성할 내용 요약' }],
    steps: ['string — 구현 순서'],
    testCases: ['string — 테스트 시나리오'],
  }),
  systemPrompt: `너는 OU 플랫폼의 구현 전문가야.
OU 프로젝트 구조:
- src/app/ — 라우트 (App Router)
- src/components/ — 컴포넌트 (graph/, chat/, views/, ui/)
- src/lib/ — 라이브러리 (pipeline/, llm/, workers/, utils/)
- src/stores/ — Zustand 스토어
- src/types/ — TypeScript 타입

기술 설계서와 코드베이스 컨텍스트를 받아 다음을 제안해:
1. files: 생성/수정할 파일 (path, changes)
   - 기존 파일 수정 시 어떤 부분을 변경하는지 명시
   - 새 파일은 기존 패턴을 따를 것
2. steps: 구현 순서 (의존 관계 고려)
3. testCases: 검증할 테스트 시나리오

도메인 중립 원칙을 지켜. 특정 도메인 하드코딩 금지.
JSON 객체로만 반환해. 다른 텍스트는 포함하지 마.`,
};

registerAgent(implementationAdvisor);
