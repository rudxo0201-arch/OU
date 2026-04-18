/**
 * LLM Provider — Public API
 *
 * 하위 호환: streamWithClaude는 router.chatWithFallback으로 위임.
 * 새 코드는 router.ts의 chatWithFallback / completeWithFallback 사용 권장.
 */

export type { LLMMessage, LLMOptions, LLMProvider, LLMStreamCallbacks, CostEntry } from './types';
export { chatWithFallback, completeWithFallback, getProvider } from './router';
export { AnthropicProvider } from './anthropic';
export { OpenAIProvider } from './openai';

import { chatWithFallback } from './router';
import type { LLMMessage } from './types';

/**
 * @deprecated chatWithFallback를 직접 사용하세요.
 * 하위 호환용 래퍼 — Anthropic → OpenAI 자동 폴백 포함.
 */
export async function streamWithClaude(opts: {
  messages: LLMMessage[];
  systemPrompt?: string;
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}) {
  await chatWithFallback({
    messages: opts.messages,
    systemPrompt: opts.systemPrompt,
    onChunk: opts.onChunk,
    onComplete: (fullText) => opts.onComplete(fullText),
    onError: opts.onError,
  });
}
