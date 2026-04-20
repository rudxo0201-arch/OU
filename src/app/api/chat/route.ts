import { NextRequest } from 'next/server';

export const maxDuration = 60; // Vercel Pro 최대 60초
import { createClient } from '@/lib/supabase/server';
import { chatWithFallback } from '@/lib/llm/router';
import type { LLMMessage } from '@/lib/llm/types';
import { buildSystemPrompt } from '@/lib/llm/prompts';
import { saveMessageAsync } from '@/lib/pipeline/layer2';
import { searchUserData, searchAdminData, isQuestion, getUserDataCounts } from '@/lib/search/inline';
import { stripLLMMeta } from '@/lib/utils/stripLLMMeta';
import crypto from 'crypto';
import { generateCacheKey, getCachedResponse, setCachedResponse } from '@/lib/cache/redis';
import { isAdminEmail } from '@/lib/auth/roles';
import { findScenarioResponse } from '@/data/scenario-responses';
import { classifyDomain } from '@/lib/pipeline/classifier';
import { MODEL_PROVIDER_MAP, isOUModel } from '@/lib/llm/models';
import { decryptLLMKey } from '@/lib/auth/llm-key';

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

  let body: { messages?: Array<{ role: string; content: string }>; isGuest?: boolean; selectedModel?: string; linkedNodeId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, isGuest, linkedNodeId } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── 시나리오 캐싱: LLM 호출 없이 사전 생성 응답 반환 ──
    const lastMsg = messages[messages.length - 1];
    const scenarioMatch = findScenarioResponse(lastMsg.content);
    if (scenarioMatch) {
      const { domain, viewHint, confidence } = await classifyDomain(lastMsg.content);

      // 노드 생성은 그대로 (데이터 파이프라인 실행)
      saveMessageAsync({
        userId: user?.id,
        userMessage: lastMsg.content,
        assistantMessage: scenarioMatch.response,
      }).catch(() => {});

      // 캐시된 응답을 SSE로 스트리밍
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: scenarioMatch.response })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, domain, viewHint, confidence, scenarioId: scenarioMatch.id })}\n\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    const userPlan = user ? 'free' : 'guest';

    // --- 동적 시스템 프롬프트 구성 ---
    const lastUserMessage = messages[messages.length - 1]?.content ?? '';

    // 대화 히스토리: 최근 20개 메시지만 전송
    const recentMessages = messages.slice(-20) as LLMMessage[];

    // 로그인 사용자: 데이터 통계 + RAG 검색
    let dataCounts: Record<string, number> = {};
    let totalNodes = 0;
    let ragResults: string[] = [];
    let adminDbResults: string[] = [];
    let adminDbSources: string[] = [];

    // 관리자 DB 검색 (본초/방제/한자/상한론 — 모든 유저 대상, 비용 0)
    const adminDbPromise = isQuestion(lastUserMessage)
      ? searchAdminData(supabase, lastUserMessage, 5).catch(() => ({ results: [], sources: [] }))
      : Promise.resolve({ results: [], sources: [] });

    if (user) {
      // 관리자 여부 확인 — 관리자는 자신의 운영 데이터도 RAG에 포함
      const userIsAdmin = user.email ? isAdminEmail(user.email) : false;

      // 병렬로 데이터 통계 조회 + 질문 시 RAG 검색
      const dataCountsPromise = getUserDataCounts(supabase, user.id);

      // 질문이거나 긴 메시지(20자↑)일 때만 RAG — 짧은 저장 요청은 스킵 (~800ms 절감)
      const needsRag = isQuestion(lastUserMessage) || lastUserMessage.length >= 20;
      const ragPromise = needsRag
        ? searchUserData(supabase, user.id, lastUserMessage, 5, userIsAdmin)
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
          .catch(() => [])
        : Promise.resolve([]);

      const [countResult, ragResult, adminResult] = await Promise.all([dataCountsPromise, ragPromise, adminDbPromise]);
      dataCounts = countResult.counts;
      totalNodes = countResult.total;
      ragResults = ragResult;
      adminDbResults = adminResult.results;
      adminDbSources = adminResult.sources;
    } else {
      // 게스트도 관리자 DB 검색 가능
      const adminResult = await adminDbPromise;
      adminDbResults = adminResult.results;
      adminDbSources = adminResult.sources;
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

    // --- BYOK: 사용자 모델 선택 + 키 조회 ---
    let selectedModel: string | undefined;
    let userApiKey: string | undefined;
    let isUserKey = false;

    if (body.selectedModel && user) {
      const providerName = MODEL_PROVIDER_MAP[body.selectedModel];
      if (providerName) {
        if (!isOUModel(body.selectedModel)) {
          // BYOK 모델 → 사용자 키 필요
          const key = await decryptLLMKey(user.id, providerName);
          if (key) {
            selectedModel = body.selectedModel;
            userApiKey = key;
            isUserKey = true;
          } else {
            return new Response(
              JSON.stringify({ error: 'API_KEY_REQUIRED', provider: providerName }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // OU 제공 모델을 명시적으로 선택한 경우
          selectedModel = body.selectedModel;
        }
      }
    }

    const systemPrompt = buildSystemPrompt({
      dataCounts,
      totalNodes,
      ragResults: ragResults.length > 0 ? ragResults : undefined,
      adminDbResults: adminDbResults.length > 0 ? adminDbResults : undefined,
      adminDbSources: adminDbSources.length > 0 ? adminDbSources : undefined,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let savedData: { domain?: string; nodeId?: string; confidence?: string; domain_data?: Record<string, any>; additionalNodes?: Array<{ id: string; domain: string; domain_data: Record<string, any> }> } = {};

          // 처리 시작 즉시 상태 메시지 전송 (Vercel 연결 유지 + UX)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: '...' })}\n\n`));

          // 실시간 토큰 스트리밍 상태
          let inMetaBlock = false; // 메타블록 시작 감지 시 true
          let onChunkBuf = ''; // 경계 감지용 소형 버퍼 (마지막 2자 유지)

          let lastHeartbeat = Date.now();
          await chatWithFallback({
            messages: recentMessages,
            systemPrompt,
            userPlan,
            userId: user?.id,
            selectedModel,
            userApiKey,
            isUserKey,
            onChunk: (token) => {
              if (inMetaBlock) {
                // 메타블록 진입 후: heartbeat만 전송
                const now = Date.now();
                if (now - lastHeartbeat > 2000) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: '...' })}\n\n`));
                  lastHeartbeat = now;
                }
                return;
              }

              onChunkBuf += token;
              const backtickIdx = onChunkBuf.indexOf('```');

              if (backtickIdx !== -1) {
                // 메타블록 시작 감지: 직전까지만 전송
                inMetaBlock = true;
                const safe = onChunkBuf.slice(0, backtickIdx);
                if (safe) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: safe })}\n\n`));
                return;
              }

              // 버퍼 마지막 2자 유지 (``` 경계 보호), 나머지 전송
              if (onChunkBuf.length > 2) {
                const toSend = onChunkBuf.slice(0, -2);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: toSend })}\n\n`));
                onChunkBuf = onChunkBuf.slice(-2);
              }
            },
            onComplete: async (fullText, provider) => {
              // Redis 캐시 저장 (동적 TTL: 일반 지식 24h, RAG 포함 1h)
              if (cacheable && cacheKey) {
                setCachedResponse(cacheKey, fullText, cacheTtl).catch(() => {});
              }

              // LLM 메타 파싱: 도메인 + intent + viewOptions + segments 추출
              const metaMatch = fullText.match(/```json:meta\s*\n?([\s\S]*?)```/);
              let domainHint: string | undefined;
              let llmSuggestions: string[] | undefined;
              let intent: string | undefined;
              let viewOptions: string[] | undefined;
              let viewFilter: Record<string, unknown> | undefined;
              let viewCards: Array<{ front: string; back: string }> | undefined;
              let segments: Array<{ text: string; domain: string; intent?: string; viewOptions?: string[]; filter?: Record<string, unknown>; cards?: Array<{ front: string; back: string }> }> | undefined;
              if (metaMatch) {
                try {
                  const meta = JSON.parse(metaMatch[1].trim());
                  domainHint = meta.domain;
                  intent = meta.intent;
                  if (Array.isArray(meta.viewOptions) && meta.viewOptions.length > 0) {
                    viewOptions = meta.viewOptions;
                  }
                  if (meta.filter && typeof meta.filter === 'object') {
                    viewFilter = meta.filter;
                  }
                  if (Array.isArray(meta.cards) && meta.cards.length > 0) {
                    viewCards = meta.cards;
                  }
                  if (Array.isArray(meta.suggestions) && meta.suggestions.length > 0) {
                    llmSuggestions = meta.suggestions.slice(0, 3);
                  }
                  if (Array.isArray(meta.segments) && meta.segments.length > 1) {
                    segments = meta.segments.filter(
                      (s: any) => typeof s.text === 'string' && s.text.trim() && typeof s.domain === 'string'
                    );
                    if (segments && segments.length < 2) segments = undefined;
                    // 혼합 세그먼트: viewOptions가 없으면 첫 번째 A/B 세그먼트에서 추출
                    if (segments && !viewOptions) {
                      const firstViewSeg = segments.find(s => Array.isArray(s.viewOptions) && s.viewOptions.length > 0);
                      if (firstViewSeg) {
                        viewOptions = firstViewSeg.viewOptions;
                        viewFilter = firstViewSeg.filter;
                        viewCards = firstViewSeg.cards;
                        intent = intent || firstViewSeg.intent;
                      }
                    }
                  }
                } catch { /* skip */ }
              }

              // 메타블록 제거 — 클라이언트에는 cleanText만 전달
              const cleanText = stripLLMMeta(fullText);

              // 남은 버퍼 플러시 (메타블록 없이 종료된 경우)
              if (!inMetaBlock && onChunkBuf) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: onChunkBuf })}\n\n`));
                onChunkBuf = '';
              }

              // 최종 텍스트 보정: 클라이언트가 누적한 토큰과 정확히 일치시킴
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ textFinal: cleanText })}\n\n`));

              // Layer 2: 비동기 DataNode 저장 (domainHint 전달 → classifyDomain 스킵)
              let saveError = false;
              try {
                const result = await saveMessageAsync({
                  userId: user?.id,
                  userMessage: messages[messages.length - 1]?.content ?? '',
                  assistantMessage: fullText,
                  linkedNodeId: linkedNodeId ?? null,
                  domainHint,
                  segments,
                });
                if (result?.domain) {
                  savedData = {
                    domain: result.domain,
                    nodeId: result.node?.id,
                    confidence: result.confidence,
                    domain_data: result.node?.domain_data,
                    additionalNodes: result.additionalNodes,
                  };
                }
              } catch (err) {
                console.error('[Layer2] saveMessageAsync failed:', err);
                saveError = true;
              }

              // viewData: 뷰 선택지 (회원이 선택 후 View 패널에 렌더링)
              const viewData = (viewOptions && viewOptions.length > 0) ? {
                viewOptions,
                filter: viewFilter,
                cards: viewCards,
                intent,
              } : undefined;

              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ done: true, fullText: cleanText, provider, suggestions: llmSuggestions, viewData, ...savedData, ...(saveError ? { saveError: true } : {}) })}\n\n`
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
