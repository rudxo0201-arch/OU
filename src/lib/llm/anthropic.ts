/**
 * AnthropicProvider — Claude 기반 LLM Provider
 *
 * 채팅(기본): claude-sonnet-4-5
 * 배치(트리플 추출 등): claude-haiku-4-5-latest
 */

import type { LLMProvider, LLMMessage, LLMOptions, LLMStreamCallbacks } from './types';

const DEFAULT_MODEL = 'claude-sonnet-4-5';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';

  constructor(private apiKey?: string) {}

  private async getClient() {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    return new Anthropic({ apiKey: this.apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  async chatStream(
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks,
    options?: LLMOptions,
  ): Promise<void> {
    const client = await this.getClient();

    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const stream = await client.messages.stream({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature,
      system: options?.system,
      messages: anthropicMessages,
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        fullText += chunk.delta.text;
        callbacks.onChunk(chunk.delta.text);
      }
    }
    callbacks.onComplete(fullText);
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const client = await this.getClient();

    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await client.messages.create({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature,
      system: options?.system,
      messages: anthropicMessages,
    });

    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
