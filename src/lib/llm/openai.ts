/**
 * OpenAIProvider — GPT 기반 LLM Provider (폴백용)
 *
 * 기본 모델: gpt-4o-mini (저비용 폴백)
 */

import type { LLMProvider, LLMMessage, LLMOptions, LLMStreamCallbacks } from './types';

const DEFAULT_MODEL = 'gpt-4o-mini';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';

  constructor(private apiKey?: string) {}

  private async getClient() {
    const OpenAI = (await import('openai')).default;
    return new OpenAI({ apiKey: this.apiKey ?? process.env.OPENAI_API_KEY });
  }

  private toOpenAIMessages(messages: LLMMessage[], system?: string) {
    const result: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (system) {
      result.push({ role: 'system', content: system });
    }

    for (const m of messages) {
      if (m.role === 'system') {
        result.push({ role: 'system', content: m.content });
      } else {
        result.push({ role: m.role, content: m.content });
      }
    }

    return result;
  }

  async chatStream(
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks,
    options?: LLMOptions,
  ): Promise<void> {
    const client = await this.getClient();

    const openaiMessages = this.toOpenAIMessages(messages, options?.system);

    const stream = await client.chat.completions.create({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature,
      messages: openaiMessages,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        callbacks.onChunk(delta);
      }
    }
    callbacks.onComplete(fullText);
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const client = await this.getClient();

    const openaiMessages = this.toOpenAIMessages(messages, options?.system);

    const response = await client.chat.completions.create({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature,
      messages: openaiMessages,
    });

    return {
      text: response.choices[0]?.message?.content ?? '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    };
  }
}
