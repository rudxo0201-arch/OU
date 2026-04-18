/**
 * Agent Pipeline Runner
 *
 * 시나리오 → 분석 → 기획 → 설계 → 구현 가이드 → QA
 * 각 단계는 순차 실행되며, 이전 단계의 출력이 다음 단계의 입력이 된다.
 * 모든 LLM 호출은 api_cost_log에 기록된다.
 */

import { completeWithFallback } from '@/lib/llm/router';
import { getAgent } from './registry';

// 에이전트 정의를 레지스트리에 등록
import './definitions';

export type PipelineStage = 'analyze' | 'plan' | 'spec' | 'implement' | 'qa';

export interface PipelineResult {
  scenarioId: string;
  scenarioText: string;
  analysis: any;
  plan: any;
  spec: any;
  implementation: any;
  qa: any;
  status: 'complete' | 'partial' | 'failed';
  error?: string;
  stoppedAt?: PipelineStage;
  costSummary: { totalTokens: number; stages: Record<string, number> };
}

/** 현재 OU에 구현된 기능 목록 (기획 에이전트에 전달) */
const CURRENT_FEATURES = [
  '채팅 입력 (텍스트)',
  '파일 업로드 (이미지/PDF → OCR)',
  '음성 입력 (STT)',
  'DataNode 자동 생성 (파이프라인)',
  '트리플 추출',
  '그래프뷰 (PixiJS)',
  '카드뷰',
  '테이블뷰',
  '캘린더뷰',
  '타임라인뷰',
  '임베딩 기반 검색',
  '시나리오 생성',
  'SNS 피드',
  '관리자 패널',
  '회원 관리',
  '비용 모니터링',
];

const MODEL_MAP: Record<string, string> = {
  haiku: 'claude-haiku-4-5-latest',
  sonnet: 'claude-sonnet-4-5',
};

/**
 * 단일 에이전트를 실행한다.
 */
export async function runAgent(
  agentId: string,
  input: any,
): Promise<{ result: any; tokens: number }> {
  const agent = getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const userMessage = typeof input === 'string' ? input : JSON.stringify(input, null, 2);

  const response = await completeWithFallback(
    [{ role: 'user', content: userMessage }],
    {
      system: agent.systemPrompt,
      maxTokens: 4096,
      temperature: 0.3,
      model: MODEL_MAP[agent.model],
      operation: `agent:${agentId}`,
    },
  );

  // JSON 파싱 시도
  let parsed: any;
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // JSON 파싱 실패 시 원문 반환
    parsed = { raw: response.text, parseError: true };
  }

  const tokens = response.inputTokens + response.outputTokens;
  return { result: parsed, tokens };
}

/**
 * 시나리오 파이프라인을 실행한다.
 *
 * 각 단계를 순차 실행하며, stopAfter 옵션으로 중간 중단 가능.
 */
export async function runScenarioPipeline(
  scenarioText: string,
  options?: {
    scenarioId?: string;
    stopAfter?: PipelineStage;
  },
): Promise<PipelineResult> {
  const stages: PipelineStage[] = ['analyze', 'plan', 'spec', 'implement', 'qa'];
  const stopIndex = options?.stopAfter
    ? stages.indexOf(options.stopAfter)
    : stages.length - 1;

  const result: PipelineResult = {
    scenarioId: options?.scenarioId ?? `pipeline-${Date.now()}`,
    scenarioText,
    analysis: null,
    plan: null,
    spec: null,
    implementation: null,
    qa: null,
    status: 'partial',
    costSummary: { totalTokens: 0, stages: {} },
  };

  try {
    // Stage 1: Analyze
    const analysisRun = await runAgent('scenario-analyzer', scenarioText);
    result.analysis = analysisRun.result;
    result.costSummary.stages.analyze = analysisRun.tokens;
    result.costSummary.totalTokens += analysisRun.tokens;

    if (stopIndex === 0) {
      result.stoppedAt = 'analyze';
      return result;
    }

    // Stage 2: Plan
    const planInput = {
      analysis: result.analysis,
      currentFeatures: CURRENT_FEATURES,
    };
    const planRun = await runAgent('feature-planner', planInput);
    result.plan = planRun.result;
    result.costSummary.stages.plan = planRun.tokens;
    result.costSummary.totalTokens += planRun.tokens;

    if (stopIndex === 1) {
      result.stoppedAt = 'plan';
      return result;
    }

    // Stage 3: Spec
    const specRun = await runAgent('spec-designer', result.plan);
    result.spec = specRun.result;
    result.costSummary.stages.spec = specRun.tokens;
    result.costSummary.totalTokens += specRun.tokens;

    if (stopIndex === 2) {
      result.stoppedAt = 'spec';
      return result;
    }

    // Stage 4: Implementation
    const implInput = {
      spec: result.spec,
      codebaseContext: `OU 프로젝트: Next.js 14 App Router, Mantine v7, Supabase, PixiJS.
현재 기능: ${CURRENT_FEATURES.join(', ')}`,
    };
    const implRun = await runAgent('implementation-advisor', implInput);
    result.implementation = implRun.result;
    result.costSummary.stages.implement = implRun.tokens;
    result.costSummary.totalTokens += implRun.tokens;

    if (stopIndex === 3) {
      result.stoppedAt = 'implement';
      return result;
    }

    // Stage 5: QA
    const qaInput = {
      scenario: scenarioText,
      implementation: result.implementation,
    };
    const qaRun = await runAgent('qa-agent', qaInput);
    result.qa = qaRun.result;
    result.costSummary.stages.qa = qaRun.tokens;
    result.costSummary.totalTokens += qaRun.tokens;

    result.status = 'complete';
    return result;
  } catch (error: any) {
    result.status = 'failed';
    result.error = error.message ?? String(error);
    return result;
  }
}
