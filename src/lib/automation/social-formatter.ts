/**
 * Social Post Formatter — LLM-powered content reformatting
 *
 * 도메인 중립: 어떤 콘텐츠든 SNS 포맷으로 변환.
 * Haiku 사용으로 비용 최적화.
 */

import { completeWithFallback } from '@/lib/llm';

export interface InstagramResult {
  text: string;
  imagePrompt?: string;
}

/**
 * 콘텐츠를 인스타그램 포스트 형식으로 변환
 */
export async function formatForInstagram(
  content: string,
  options?: { hashtags?: boolean; userId?: string },
): Promise<InstagramResult> {
  const hashtagInstruction = options?.hashtags !== false
    ? '마지막에 관련 해시태그 5~10개를 추가해.'
    : '해시태그는 넣지 마.';

  const result = await completeWithFallback(
    [
      {
        role: 'user',
        content: `다음 내용을 인스타그램 포스트로 변환해줘.

규칙:
- 짧은 문단으로 나누기 (2~3줄씩)
- 핵심 내용만 간결하게
- 이모지를 적절히 사용
- ${hashtagInstruction}
- 이미지 생성을 위한 프롬프트도 한 줄로 제안해 (영어로)

응답 형식:
---POST---
(포스트 내용)
---IMAGE_PROMPT---
(이미지 생성 프롬프트, 영어)

원본 내용:
${content}`,
      },
    ],
    {
      operation: 'social_format_instagram',
      userId: options?.userId,
      maxTokens: 1024,
    },
  );

  const text = result.text;
  const postMatch = text.match(/---POST---([\s\S]*?)(?:---IMAGE_PROMPT---|$)/);
  const imageMatch = text.match(/---IMAGE_PROMPT---([\s\S]*?)$/);

  return {
    text: postMatch?.[1]?.trim() ?? text.trim(),
    imagePrompt: imageMatch?.[1]?.trim() || undefined,
  };
}

/**
 * 콘텐츠를 Threads 포스트 형식으로 변환
 */
export async function formatForThreads(
  content: string,
  options?: { userId?: string },
): Promise<string> {
  const result = await completeWithFallback(
    [
      {
        role: 'user',
        content: `다음 내용을 Threads 포스트로 변환해줘.

규칙:
- 500자 이내
- 대화하듯 캐주얼한 톤
- 핵심 포인트 1~2개만
- 이모지 최소한으로
- 해시태그 없음

원본 내용:
${content}`,
      },
    ],
    {
      operation: 'social_format_threads',
      userId: options?.userId,
      maxTokens: 512,
    },
  );

  return result.text.trim();
}
