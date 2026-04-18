/**
 * LLM Router — Auto-Fallback + Cost Logging + BYOK
 *
 * 기본: Anthropic → 실패 시: OpenAI 폴백
 * BYOK: 사용자 키로 선택된 모델 직접 호출 (폴백 없음)
 * 모든 호출은 api_cost_log에 기록
 */

import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { MODEL_PROVIDER_MAP } from './models';
import type { LLMMessage, LLMOptions, LLMStreamCallbacks, LLMProvider } from './types';
import { createAdminClient } from '@/lib/supabase/admin';
import { logLLMCall } from '@/lib/logicization/observer';

const anthropic = new AnthropicProvider();
const openai = new OpenAIProvider();

/** 비용 단가 (USD per 1M tokens → per token) */
const COST_RATES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5': { input: 3.0 / 1e6, output: 15.0 / 1e6 },
  'claude-sonnet-4-5-20241022': { input: 3.0 / 1e6, output: 15.0 / 1e6 },
  'claude-haiku-4-5-20251001': { input: 0.25 / 1e6, output: 1.25 / 1e6 },
  'claude-opus-4-6': { input: 15.0 / 1e6, output: 75.0 / 1e6 },
  'gpt-4o': { input: 2.5 / 1e6, output: 10.0 / 1e6 },
  'gpt-4o-mini': { input: 0.15 / 1e6, output: 0.6 / 1e6 },
  'gemini-2.0-flash': { input: 0.10 / 1e6, output: 0.40 / 1e6 },
  'gemini-2.5-pro-preview-05-06': { input: 1.25 / 1e6, output: 10.0 / 1e6 },
  'text-embedding-3-small': { input: 0.02 / 1e6, output: 0 },
  'gemini-1.5-flash': { input: 0.075 / 1e6, output: 0.3 / 1e6 },
};

/** Plan → 채팅 모델 매핑 */
const PLAN_MODEL_MAP: Record<string, string> = {
  free: 'claude-haiku-4-5-20251001',
  guest: 'claude-haiku-4-5-20251001',
  pro: 'claude-sonnet-4-5',
  team: 'claude-sonnet-4-5',
};

function getModelForPlan(plan: string): string {
  return PLAN_MODEL_MAP[plan] ?? 'claude-haiku-4-5-20251001';
}

/** Provider 인스턴스 생성 (BYOK용 apiKey 주입) */
function createProvider(providerName: string, apiKey?: string): LLMProvider {
  switch (providerName) {
    case 'anthropic': return apiKey ? new AnthropicProvider(apiKey) : anthropic;
    case 'openai': return apiKey ? new OpenAIProvider(apiKey) : openai;
    case 'google': return new GeminiProvider(apiKey);
    default: throw new Error(`Unknown provider: ${providerName}`);
  }
}

async function logCost(opts: {
  operation: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  tokens?: number;
  nodeId?: string;
  userId?: string;
  isUserKey?: boolean;
}) {
  try {
    const supabase = createAdminClient();
    const rates = COST_RATES[opts.model] ?? { input: 0, output: 0 };
    const costUsd = opts.isUserKey
      ? 0
      : opts.inputTokens != null && opts.outputTokens != null
        ? opts.inputTokens * rates.input + opts.outputTokens * rates.output
        : (opts.tokens ?? 0) * rates.input;

    await supabase.from('api_cost_log').insert({
      operation: opts.operation,
      model: opts.model,
      tokens: (opts.inputTokens ?? 0) + (opts.outputTokens ?? 0) + (opts.tokens ?? 0),
      cost_usd: costUsd,
      is_user_key: opts.isUserKey ?? false,
      node_id: opts.nodeId ?? null,
      user_id: opts.userId ?? null,
    });
  } catch (e) {
    console.error('[Router] cost log failed:', e);
  }
}

/** Export for direct cost logging from other modules (embed, OCR, etc.) */
export { logCost, COST_RATES };

/**
 * 스트리밍 채팅 with Auto-Fallback + BYOK
 *
 * BYOK: selectedModel + userApiKey → 직접 호출 (폴백 없음)
 * OU 키: Anthropic 시도 → 실패 시 OpenAI로 폴백
 */
export async function chatWithFallback(opts: {
  messages: LLMMessage[];
  systemPrompt?: string;
  userPlan?: string;
  userId?: string;
  /** BYOK: 사용자가 선택한 모델 */
  selectedModel?: string;
  /** BYOK: 복호화된 사용자 API 키 */
  userApiKey?: string;
  /** BYOK: 사용자 키 여부 (비용 로깅용) */
  isUserKey?: boolean;
  onChunk: (text: string) => void;
  onComplete: (fullText: string, provider: string) => void;
  onError: (error: Error) => void;
}) {
  const model = opts.selectedModel ?? getModelForPlan(opts.userPlan ?? 'free');
  const providerName = MODEL_PROVIDER_MAP[model] ?? 'anthropic';
  const isUserKey = opts.isUserKey ?? false;

  const llmOptions: LLMOptions = {
    system: opts.systemPrompt,
    maxTokens: 2048,
    model,
  };

  // BYOK: 사용자 키로 직접 호출 (폴백 없음)
  if (isUserKey && opts.userApiKey) {
    const provider = createProvider(providerName, opts.userApiKey);

    const callbacks: LLMStreamCallbacks = {
      onChunk: opts.onChunk,
      onComplete: (fullText) => opts.onComplete(fullText, providerName),
      onError: opts.onError,
    };

    try {
      await provider.chatStream(opts.messages, callbacks, llmOptions);
      await logCost({
        operation: 'chat_byok',
        provider: providerName,
        model,
        userId: opts.userId,
        isUserKey: true,
      });
    } catch (error) {
      console.error(`[Router] BYOK ${providerName} failed:`, error);
      opts.onError(error instanceof Error ? error : new Error(String(error)));
    }
    return;
  }

  // OU 키: 기존 Auto-Fallback 로직
  const callbacks: LLMStreamCallbacks = {
    onChunk: opts.onChunk,
    onComplete: (fullText) => opts.onComplete(fullText, 'anthropic'),
    onError: opts.onError,
  };

  try {
    await anthropic.chatStream(opts.messages, callbacks, llmOptions);

    await logCost({
      operation: 'chat',
      provider: 'anthropic',
      model,
      userId: opts.userId,
    });
  } catch (anthropicError) {
    console.warn('[Router] Anthropic failed, falling back to OpenAI:', anthropicError);

    const fallbackCallbacks: LLMStreamCallbacks = {
      onChunk: opts.onChunk,
      onComplete: (fullText) => opts.onComplete(fullText, 'openai'),
      onError: opts.onError,
    };

    try {
      await openai.chatStream(opts.messages, fallbackCallbacks, { ...llmOptions, model: 'gpt-4o-mini' });

      await logCost({
        operation: 'chat_fallback',
        provider: 'openai',
        model: 'gpt-4o-mini',
        userId: opts.userId,
      });
    } catch (openaiError) {
      console.error('[Router] OpenAI fallback also failed:', openaiError);
      opts.onError(openaiError instanceof Error ? openaiError : new Error(String(openaiError)));
    }
  }
}

/**
 * 비스트리밍 완성 with Auto-Fallback (배치 작업용)
 */
export async function completeWithFallback(
  messages: LLMMessage[],
  options?: LLMOptions & { operation?: string; nodeId?: string; userId?: string },
): Promise<{ text: string; provider: string; inputTokens: number; outputTokens: number }> {
  // 배치 작업은 항상 Haiku 사용 (비용 최적화)
  const batchModel = 'claude-haiku-4-5-20251001';
  const batchOptions = { ...options, model: batchModel };

  // 입력 텍스트 구성 (observer 기록용)
  const inputText = messages.map(m => m.content).join('\n');

  try {
    const result = await anthropic.complete(messages, batchOptions);

    await logCost({
      operation: options?.operation ?? 'complete',
      provider: 'anthropic',
      model: batchModel,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      nodeId: options?.nodeId,
      userId: options?.userId,
    });

    // Observer: 입출력 기록 (로직화 에이전트 데이터 축적)
    logLLMCall({
      operation: options?.operation ?? 'complete',
      inputText,
      outputText: result.text,
      model: batchModel,
      tokensUsed: result.inputTokens + result.outputTokens,
      costUsd: (result.inputTokens * (COST_RATES[batchModel]?.input ?? 0)) +
               (result.outputTokens * (COST_RATES[batchModel]?.output ?? 0)),
      userId: options?.userId,
      nodeId: options?.nodeId,
    }).catch(() => {}); // fire-and-forget

    return { ...result, provider: 'anthropic' };
  } catch (anthropicError) {
    console.warn('[Router] Anthropic complete failed, falling back to OpenAI:', anthropicError);

    const fallbackModel = options?.model ?? 'gpt-4o-mini';
    const result = await openai.complete(messages, options);

    await logCost({
      operation: (options?.operation ?? 'complete') + '_fallback',
      provider: 'openai',
      model: fallbackModel,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      nodeId: options?.nodeId,
      userId: options?.userId,
    });

    // Observer: 폴백도 기록
    logLLMCall({
      operation: options?.operation ?? 'complete',
      inputText,
      outputText: result.text,
      model: fallbackModel,
      tokensUsed: result.inputTokens + result.outputTokens,
      userId: options?.userId,
      nodeId: options?.nodeId,
    }).catch(() => {});

    return { ...result, provider: 'openai' };
  }
}

/**
 * 특정 프로바이더 직접 접근 (OCR 등 특수 용도)
 */
export function getProvider(name: 'anthropic' | 'openai' | 'google', apiKey?: string): LLMProvider {
  return createProvider(name, apiKey);
}
