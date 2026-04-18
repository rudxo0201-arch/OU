/**
 * GeminiProvider — Google Gemini 기반 LLM Provider
 *
 * 기본 모델: gemini-2.0-flash
 */

import type { LLMProvider, LLMMessage, LLMOptions, LLMStreamCallbacks } from './types';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export class GeminiProvider implements LLMProvider {
  readonly name = 'google';

  constructor(private apiKey?: string) {}

  private async getClient() {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    return new GoogleGenerativeAI(this.apiKey ?? process.env.GEMINI_API_KEY ?? '');
  }

  private toGeminiMessages(messages: LLMMessage[]) {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }],
      }));
  }

  async chatStream(
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks,
    options?: LLMOptions,
  ): Promise<void> {
    const genAI = await this.getClient();
    const model = genAI.getGenerativeModel({
      model: options?.model ?? DEFAULT_MODEL,
      systemInstruction: options?.system || undefined,
    });

    const geminiMessages = this.toGeminiMessages(messages);

    // 마지막 메시지를 분리 (sendMessageStream용)
    const history = geminiMessages.slice(0, -1);
    const lastMessage = geminiMessages[geminiMessages.length - 1];

    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature,
      },
    });

    const result = await chat.sendMessageStream(lastMessage.parts);

    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        callbacks.onChunk(text);
      }
    }
    callbacks.onComplete(fullText);
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const genAI = await this.getClient();
    const model = genAI.getGenerativeModel({
      model: options?.model ?? DEFAULT_MODEL,
      systemInstruction: options?.system || undefined,
    });

    const geminiMessages = this.toGeminiMessages(messages);
    const history = geminiMessages.slice(0, -1);
    const lastMessage = geminiMessages[geminiMessages.length - 1];

    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature,
      },
    });

    const result = await chat.sendMessage(lastMessage.parts);
    const response = result.response;
    const text = response.text();
    const usage = response.usageMetadata;

    return {
      text,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  }
}
