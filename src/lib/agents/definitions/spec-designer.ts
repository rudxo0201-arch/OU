/**
 * Spec Designer Agent — 설계 에이전트
 *
 * 기능 기획 결과를 받아 기술 설계서(컴포넌트, API, 데이터 모델)를 생성한다.
 * Sonnet 사용: 복잡한 추론 필요.
 */

import { registerAgent } from '../registry';
import type { OUAgent } from '../registry';

export const specDesigner: OUAgent = {
  id: 'spec-designer',
  name: 'Spec Designer',
  nameKo: '설계',
  description: 'Designs technical specifications including components, APIs, and data models from a feature plan.',
  model: 'sonnet',
  inputSchema: 'plan: FeaturePlan — 기능 기획 결과 (newFeatures, existingFeatures, gaps)',
  outputSchema: JSON.stringify({
    components: [{ name: 'string', props: ['string'], behavior: 'string' }],
    apis: [{ path: 'string', method: 'GET|POST|PUT|DELETE', description: 'string' }],
    dataModels: [{ name: 'string', fields: [{ name: 'string', type: 'string', description: 'string' }] }],
  }),
  systemPrompt: `너는 OU 플랫폼의 기술 설계 전문가야.
OU의 기술 스택: Next.js 14 (App Router), TypeScript, Mantine v7, Zustand, Supabase, PixiJS.

기능 기획 결과를 받아 다음을 설계해:
1. components: 필요한 React 컴포넌트 (name, props 배열, behavior 설명)
   - OU의 기존 패턴을 따를 것 (Mantine 기반, Phosphor Icons)
   - 뷰 컴포넌트는 뷰 레지스트리 패턴으로 등록
2. apis: 필요한 API 엔드포인트 (path, method, description)
   - Next.js App Router의 route handler 패턴
   - 인증이 필요한 API는 명시
3. dataModels: 필요한 데이터 모델 (Supabase 테이블 또는 기존 테이블 확장)
   - data_nodes, triples 등 기존 스키마와의 관계 고려

도메인 중립적으로 설계해. 특정 도메인이 하드코딩되면 안 돼.
JSON 객체로만 반환해. 다른 텍스트는 포함하지 마.`,
};

registerAgent(specDesigner);
