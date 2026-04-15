/**
 * LLM Multi-Provider Types
 *
 * 도메인 중립적 LLM 추상화 계층.
 * Anthropic(기본), OpenAI(폴백), Gemini(OCR) 지원.
 */

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export interface LLMStreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * LLMProvider — 모든 LLM 공급자가 구현하는 인터페이스
 */
export interface LLMProvider {
  readonly name: string;

  /** 스트리밍 채팅 */
  chatStream(
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks,
    options?: LLMOptions,
  ): Promise<void>;

  /** 비스트리밍 완성 (배치 작업용) */
  complete(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }>;
}

export interface CostEntry {
  operation: string;
  provider: string;
  model: string;
  tokens: number;
  cost_usd: number;
  node_id?: string;
}
