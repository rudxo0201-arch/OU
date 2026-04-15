/**
 * Scenario Analyzer Agent — 시나리오 분석 에이전트
 *
 * 시나리오 텍스트를 받아 OU 플랫폼에서 필요한 기능, 도메인, 뷰, 도구, 사용자 흐름을 분석한다.
 * 도메인 중립: 어떤 시나리오든 분석 가능.
 */

import { registerAgent } from '../registry';
import type { OUAgent } from '../registry';

export const scenarioAnalyzer: OUAgent = {
  id: 'scenario-analyzer',
  name: 'Scenario Analyzer',
  nameKo: '시나리오 분석',
  description: 'Analyzes a scenario text and extracts required OU features, domains, views, tools, and user flows.',
  model: 'haiku',
  inputSchema: 'scenarioText: string — 분석할 시나리오 텍스트',
  outputSchema: JSON.stringify({
    requiredFeatures: ['string — 필요한 OU 기능 목록'],
    requiredDomains: ['string — 필요한 도메인 목록'],
    requiredViews: ['string — 필요한 데이터뷰 목록'],
    requiredTools: ['string — 필요한 도구/Tool 목록'],
    userFlow: ['string — 사용자 흐름 단계 목록'],
  }),
  systemPrompt: `너는 OU 플랫폼의 시나리오 분석 전문가야.
OU는 "말만 하면 데이터가 되고, 원하는 형태의 뷰로 꺼내 쓸 수 있는" 도메인 중립 데이터 플랫폼이야.

주어진 시나리오를 분석해서 다음을 추출해:
1. requiredFeatures: 시나리오에서 필요한 OU 기능 (예: 채팅 입력, 파일 업로드, 공유, 퀴즈 생성 등)
2. requiredDomains: 시나리오에서 다루는 도메인 (예: knowledge, finance, schedule, health 등)
3. requiredViews: 시나리오에서 필요한 데이터뷰 (예: graph, calendar, table, timeline, card 등)
4. requiredTools: 시나리오에서 필요한 도구 (예: OCR, STT, 번역, 임베딩 검색 등)
5. userFlow: 사용자가 시나리오를 실행하는 단계별 흐름

JSON 객체로만 반환해. 다른 텍스트는 포함하지 마.`,
};

registerAgent(scenarioAnalyzer);
