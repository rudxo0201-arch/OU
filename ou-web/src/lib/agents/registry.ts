/**
 * Agent Registry
 *
 * 도메인 중립적 에이전트 레지스트리.
 * 각 에이전트는 특정 역할(분석, 기획, 설계 등)을 수행하는 LLM 호출 단위.
 */

export interface OUAgent {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  systemPrompt: string;
  model: 'haiku' | 'sonnet';
  inputSchema: string;
  outputSchema: string;
}

const registry: Record<string, OUAgent> = {};

/**
 * 에이전트를 레지스트리에 등록한다.
 * 같은 id로 재등록하면 덮어쓴다.
 */
export function registerAgent(agent: OUAgent): void {
  registry[agent.id] = agent;
}

/**
 * id로 에이전트를 조회한다.
 */
export function getAgent(id: string): OUAgent | undefined {
  return registry[id];
}

/**
 * 등록된 모든 에이전트 목록을 반환한다.
 */
export function listAgents(): OUAgent[] {
  return Object.values(registry);
}

/** 레지스트리 내부 참조 (테스트용) */
export const AGENT_REGISTRY = registry;
