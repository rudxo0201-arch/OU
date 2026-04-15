import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatWithFallback } from '@/lib/llm/router';
import type { LLMMessage } from '@/lib/llm/types';
import { buildSystemPrompt } from '@/lib/llm/prompts';
import { saveMessageAsync } from '@/lib/pipeline/layer2';
import { searchUserData, isQuestion, getUserDataCounts } from '@/lib/search/inline';
import { checkTokenLimit } from '@/lib/utils/token-limit';
import crypto from 'crypto';
import { generateCacheKey, getCachedResponse, setCachedResponse } from '@/lib/cache/redis';
import { isAdminEmail } from '@/lib/auth/roles';

/**
 * Determine if a request is cacheable.
 *
 * 캐시 전략 확장:
 * - 일반 지식 질문: 24시간 캐시 (변하지 않는 지식)
 * - RAG 포함 질문: RAG 해시를 캐시 키에 포함하여 1시간 캐시
 *   (동일 사용자가 동일 질문 + 동일 데이터면 결과 동일)
 * - 개인 맥락 참조: 캐시 불가
 */
function isCacheable(
  lastMessage: string,
  ragResults: string[],
): { cacheable: boolean; ttl: number } {
  // Only cache questions
  if (!isQuestion(lastMessage)) return { cacheable: false, ttl: 0 };

  // Don't cache if message references time-sensitive personal context
  const personalKeywords = [
    '내일', '오늘', '어제', '지난', '방금', '아까',
  ];
  const lower = lastMessage.toLowerCase();
  if (personalKeywords.some(kw => lower.includes(kw))) {
    return { cacheable: false, ttl: 0 };
  }

  // RAG 결과가 있어도 캐시 가능 (RAG 해시를 키에 포함)
  // 단, TTL을 짧게 (개인 데이터 변경 가능)
  if (ragResults.length > 0) {
    return { cacheable: true, ttl: 3600 }; // 1시간
  }

  // 일반 지식 질문: 24시간 캐시
  return { cacheable: true, ttl: 86400 };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: { messages?: Array<{ role: string; content: string }>; isGuest?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, isGuest } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 구독 플랜 + 일일 토큰 한도 체크
    let userPlan = 'free';
    if (user) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single();

      userPlan = sub?.plan ?? 'free';

      const { allowed, used, limit } = await checkTokenLimit(supabase, user.id, userPlan);
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: 'TOKEN_LIMIT_EXCEEDED', used, limit, plan: userPlan }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      userPlan = 'guest';
    }

    // --- 동적 시스템 프롬프트 구성 ---
    const lastUserMessage = messages[messages.length - 1]?.content ?? '';

    // 대화 히스토리: 최근 20개 메시지만 전송
    const recentMessages = messages.slice(-20) as LLMMessage[];

    // 로그인 사용자: 데이터 통계 + RAG 검색
    let dataCounts: Record<string, number> = {};
    let totalNodes = 0;
    let ragResults: string[] = [];

    if (user) {
      // 관리자 여부 확인 — 관리자는 자신의 운영 데이터도 RAG에 포함
      const userIsAdmin = user.email ? isAdminEmail(user.email) : false;

      // 병렬로 데이터 통계 조회 + 질문 시 RAG 검색
      const dataCountsPromise = getUserDataCounts(supabase, user.id);

      let ragPromise: Promise<string[]> = Promise.resolve([]);
      if (isQuestion(lastUserMessage)) {
        ragPromise = searchUserData(supabase, user.id, lastUserMessage, 5, userIsAdmin)
          .then(results =>
            results.map(r => {
              const date = new Date(r.created_at).toLocaleDateString('ko-KR');
              const domainLabel: Record<string, string> = {
                schedule: '일정', finance: '가계부', task: '할 일',
                emotion: '감정', idea: '아이디어', habit: '습관',
                knowledge: '지식', relation: '인물',
              };
              return `[${domainLabel[r.domain] || r.domain}] ${r.raw} (${date})`;
            })
          )
          .catch(() => []);
      }

      const [countResult, ragResult] = await Promise.all([dataCountsPromise, ragPromise]);
      dataCounts = countResult.counts;
      totalNodes = countResult.total;
      ragResults = ragResult;
    }

    // --- Redis 캐시 체크 (확장: RAG 포함 질문도 캐시) ---
    const { cacheable, ttl: cacheTtl } = isCacheable(lastUserMessage, ragResults);
    let cacheKey = '';

    if (cacheable) {
      // RAG 결과가 있으면 해시를 캐시 키에 포함 (같은 질문 + 같은 데이터 = 같은 응답)
      const ragHash = ragResults.length > 0
        ? crypto.createHash('md5').update(ragResults.join('|')).digest('hex').slice(0, 8)
        : '';
      cacheKey = generateCacheKey(messages) + (ragHash ? `:rag:${ragHash}` : '');
      const cachedResponse = await getCachedResponse(cacheKey);

      if (cachedResponse) {
        // Cache hit: SSE 스트림으로 캐시된 응답 반환
        const encoder = new TextEncoder();
        const cacheStream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ text: cachedResponse })}\n\n`
            ));
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ done: true, fullText: cachedResponse, provider: 'cache' })}\n\n`
            ));
            controller.close();
          },
        });

        return new Response(cacheStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
    }

    const systemPrompt = buildSystemPrompt({
      dataCounts,
      totalNodes,
      ragResults: ragResults.length > 0 ? ragResults : undefined,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let savedData: { domain?: string; nodeId?: string; confidence?: string } = {};

          await chatWithFallback({
            messages: recentMessages,
            systemPrompt,
            userPlan,
            userId: user?.id,
            onChunk: (text) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            },
            onComplete: async (fullText, provider) => {
              // Redis 캐시 저장 (동적 TTL: 일반 지식 24h, RAG 포함 1h)
              if (cacheable && cacheKey) {
                setCachedResponse(cacheKey, fullText, cacheTtl).catch(() => {});
              }

              // Layer 2: 비동기 DataNode 저장
              let saveError = false;
              try {
                const result = await saveMessageAsync({
                  userId: user?.id,
                  userMessage: messages[messages.length - 1]?.content ?? '',
                  assistantMessage: fullText,
                });
                if (result?.domain) {
                  savedData = {
                    domain: result.domain,
                    nodeId: result.node?.id,
                    confidence: result.confidence,
                  };
                }
              } catch (err) {
                console.error('[Layer2] saveMessageAsync failed:', err);
                saveError = true;
              }

              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ done: true, fullText, provider, ...savedData, ...(saveError ? { saveError: true } : {}) })}\n\n`
              ));
              controller.close();
            },
            onError: (error) => {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ error: error.message })}\n\n`
              ));
              controller.close();
            },
          });
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e) {
    console.error('[Chat] Unexpected error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
