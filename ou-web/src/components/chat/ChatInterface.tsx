'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Stack, Box, ScrollArea } from '@mantine/core';
import { ChatInput, type ImageUploadResult, type FileUploadResult } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { TokenGauge } from './TokenGauge';
import { SaveNudge } from './SaveNudge';
import { ViewRecommendBadge } from './ViewRecommendBadge';
import { ChatGraphPanel, type ChatGraphPanelHandle } from './ChatGraphPanel';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/stores/chatStore';

// 클라이언트 도메인 분류 — 서버 classifier와 동일 우선순위
function classifyDomainClient(text: string): string {
  if (/\d+(원|만원|천원)|결제|지출|소비|구매/.test(text)) return 'finance';
  if (/기분|감정|슬프|기쁘|화나|힘들|우울/.test(text)) return 'emotion';
  if (/해야|할 일|과제|마감|제출|숙제/.test(text)) return 'task';
  if (/결혼식|생일|약속|미팅|시험|고사|여행|예약/.test(text)) return 'schedule';
  if (/(다음주|이번주|내일|모레)/.test(text) && !/\d+(원|만원)/.test(text)) return 'schedule';
  if (/아이디어|기획|만들면|프로젝트/.test(text)) return 'idea';
  if (/운동|습관|루틴|매일/.test(text)) return 'habit';
  return 'knowledge';
}

interface ChatInterfaceProps {
  onboarding?: boolean;
  graphNodes?: any[];
}

export function ChatInterface({ onboarding, graphNodes = [] }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { messages, addMessage, turnCount } = useChatStore();
  const [streaming, setStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showGraph, setShowGraph] = useState(true);
  const viewport = useRef<HTMLDivElement>(null);
  const graphPanelRef = useRef<ChatGraphPanelHandle>(null);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // 로그인 후 복귀: localStorage에 백업된 게스트 메시지 복원
  const guestRestored = useRef(false);
  useEffect(() => {
    if (guestRestored.current) return;
    guestRestored.current = true;

    if (user && messages.length === 0) {
      const restored = useChatStore.getState().restoreGuest();
      if (restored) {
        useChatStore.getState().clearGuestBackup();
        // 복원된 노드를 그래프 패널에도 반영
        const restoredMsgs = useChatStore.getState().messages;
        restoredMsgs.forEach(m => {
          if (m.nodeCreated) {
            graphPanelRef.current?.addNode({
              id: m.nodeCreated.nodeId ?? `restored-${m.id}`,
              domain: m.nodeCreated.domain,
              raw: m.content,
              importance: 1,
            });
          }
        });
        return; // 복원됐으면 온보딩 스킵
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 온보딩 첫 메시지 (StrictMode 중복 방지)
  const onboardingDone = useRef(false);
  useEffect(() => {
    if (onboardingDone.current) return;
    if (messages.length === 0) {
      onboardingDone.current = true;
      const greeting = '안녕하세요! 저는 OU예요. 말씀하시는 대로 기록하고, 원하실 때 꺼내드릴게요. 무엇이든 편하게 말씀해주세요.';

      addMessage({
        id: 'onboarding',
        role: 'assistant',
        content: greeting,
        createdAt: new Date(),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 게스트 턴 제한 체크
  const guestLimitReached = !user && turnCount >= 10;

  const handleSend = async (text: string, imageResult?: ImageUploadResult, fileResult?: FileUploadResult) => {
    if (!text.trim() || streaming) return;

    // 게스트: 10턴 초과 시 전송 차단
    if (guestLimitReached) return;

    const userMsg: import('@/stores/chatStore').ChatMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: text,
      createdAt: new Date(),
      ...(imageResult ? {
        imagePreview: imageResult.previewUrl,
        ocrResult: { text: imageResult.text, imageType: imageResult.imageType },
      } : {}),
      ...(fileResult ? { fileResult } : {}),
    };
    addMessage(userMsg);

    // PDF 업로드: 노드가 이미 생성됐으므로 그래프에 바로 추가
    if (fileResult?.nodeId) {
      graphPanelRef.current?.addNode({
        id: fileResult.nodeId,
        domain: 'knowledge',
        raw: fileResult.fileName,
        importance: 1,
      });
    }

    const controller = new AbortController();
    setAbortController(controller);
    setStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    addMessage({ id: assistantId, role: 'assistant', content: '', createdAt: new Date(), streaming: true });

    // 직전까지의 대화 히스토리 (현재 턴 제외)
    const chatHistory = useChatStore.getState().messages
      .filter(m => m.id !== 'onboarding' && m.id !== assistantId && m.id !== userMsg.id)
      .map(m => ({ role: m.role, content: m.content }));

    // 이미지 OCR이 있으면 AI에게 구조화된 컨텍스트 전달
    const apiUserContent = imageResult
      ? `[사용자가 이미지를 보냈습니다: ${imageResult.fileName}]\n이미지 종류: ${imageResult.imageType}\n이미지 내용:\n${imageResult.text}`
      : text;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatHistory, { role: 'user', content: apiUserContent }],
          isGuest: !user,
        }),
        signal: controller.signal,
      });

      // 429: 사용량 초과 (JSON 응답)
      if (res.status === 429) {
        useChatStore.getState().updateMessage(assistantId, {
          content: '사용량을 모두 사용했어요. 업그레이드하면 더 많이 쓸 수 있어요.',
          streaming: false,
        });
        useChatStore.getState().setShowUpgradeModal(true);
        setStreaming(false);
        setAbortController(null);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              useChatStore.getState().updateMessage(assistantId, {
                content: useChatStore.getState().messages.find(m => m.id === assistantId)?.content + data.text,
              });
            }
            if (data.done) {
              // 서버에서 domain이 오면 사용, 없으면 클라이언트에서 추론
              const domain = data.domain || classifyDomainClient(text);
              const nodeId = data.nodeId || `local-${Date.now()}`;
              const confidence = data.confidence;

              useChatStore.getState().updateMessage(assistantId, {
                streaming: false,
                nodeCreated: { domain, nodeId, confidence },
              });

              // 그래프 패널에 노드 추가
              graphPanelRef.current?.addNode({
                id: nodeId,
                domain,
                raw: text,
                importance: 1,
              });
            }
            if (data.error === 'TOKEN_LIMIT_EXCEEDED') {
              useChatStore.getState().setShowUpgradeModal(true);
            }
          } catch {
            // JSON parse error, skip
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        useChatStore.getState().updateMessage(assistantId, {
          content: '[연결이 끊어졌어요. 다시 시도해주세요.]',
          streaming: false,
        });
      }
    } finally {
      setStreaming(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    abortController?.abort();
    setStreaming(false);
    setAbortController(null);
    // 스트리밍 중이던 메시지를 완료 상태로 변경
    const msgs = useChatStore.getState().messages;
    const streamingMsg = msgs.find(m => m.streaming);
    if (streamingMsg) {
      useChatStore.getState().updateMessage(streamingMsg.id, { streaming: false });
    }
  };

  // 도메인별 노드 수 계산 (뷰 추천용)
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach(m => {
      if (m.nodeCreated?.domain) {
        counts[m.nodeCreated.domain] = (counts[m.nodeCreated.domain] || 0) + 1;
      }
    });
    return counts;
  }, [messages]);

  // 뷰 추천 로직
  const viewRecommendation = useMemo(() => {
    if (domainCounts.schedule >= 3) return { domain: 'schedule', viewType: 'calendar' };
    if (domainCounts.finance >= 3) return { domain: 'finance', viewType: 'chart' };
    if (domainCounts.knowledge >= 5) return { domain: 'knowledge', viewType: 'knowledge_graph' };
    if (domainCounts.task >= 3) return { domain: 'task', viewType: 'task' };
    return null;
  }, [domainCounts]);

  // 마지막으로 추천한 뷰 타입을 추적 (중복 추천 방지)
  const lastRecommended = useRef<string | null>(null);
  const showViewRecommend = viewRecommendation && viewRecommendation.viewType !== lastRecommended.current;

  // SaveNudge dismiss 상태
  const [nudgeDismissed, setNudgeDismissed] = useState<Record<string, boolean>>({});
  const handleDismissNudge = (trigger: string) => {
    setNudgeDismissed(prev => ({ ...prev, [trigger]: true }));
  };

  return (
    <Box style={{ display: 'flex', height: '100vh' }}>
      {/* 채팅 영역 */}
      <Stack
        gap={0}
        style={{ flex: 1, minWidth: 0 }}
      >
        <ScrollArea flex={1} viewportRef={viewport}>
          <Stack gap="md" p="md" maw={720} mx="auto" pb="xl">
            {messages.map((msg, idx) => {
              // assistant 메시지의 직전 user 메시지를 찾음
              const prevUserMsg = msg.role === 'assistant'
                ? messages.slice(0, idx).reverse().find(m => m.role === 'user')
                : undefined;

              // 이 메시지가 뷰 추천 트리거 시점인지 확인
              const isLastAssistant = msg.role === 'assistant' && !msg.streaming
                && idx === messages.length - 1;
              const shouldShowViewRecommend = isLastAssistant && showViewRecommend;

              // view_created SaveNudge: 뷰 추천이 나타날 때 비로그인 사용자에게 표시
              const shouldShowViewNudge = shouldShowViewRecommend && !user && !nudgeDismissed['view_created'];

              return (
                <Box key={msg.id}>
                  <MessageBubble
                    message={msg}
                    userMessage={prevUserMsg?.content}
                    prevUserMessage={prevUserMsg}
                    onAddInfo={handleSend}
                  />
                  {shouldShowViewRecommend && viewRecommendation && (
                    <Box mt="xs">
                      <ViewRecommendBadge
                        domain={viewRecommendation.domain}
                        viewType={viewRecommendation.viewType}
                        nodes={messages
                          .filter(m => m.nodeCreated?.domain === viewRecommendation.domain)
                          .map(m => ({ id: m.nodeCreated?.nodeId, domain: m.nodeCreated?.domain, raw: m.content }))}
                      />
                    </Box>
                  )}
                  {shouldShowViewNudge && (
                    <Box mt="xs">
                      <SaveNudge trigger="view_created" onDismiss={() => handleDismissNudge('view_created')} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        </ScrollArea>

        {!user && turnCount >= 8 && !nudgeDismissed['turn_limit'] && (
          <SaveNudge trigger="turn_limit" onDismiss={() => handleDismissNudge('turn_limit')} />
        )}

        <Box p="md" maw={720} mx="auto" w="100%">
          <Stack gap={4}>
            <ChatInput
              onSend={handleSend}
              onStop={handleStop}
              streaming={streaming}
              disabled={guestLimitReached}
              loggedIn={!!user}
            />
            <TokenGauge />
          </Stack>
        </Box>
      </Stack>

      {/* 라이브 그래프 패널 — 데스크톱 ≥1024px만 */}
      {showGraph && (
        <Box
          style={{
            width: '40%',
            maxWidth: 480,
            minWidth: 280,
            height: '100vh',
          }}
          visibleFrom="md"
        >
          <ChatGraphPanel
            ref={graphPanelRef}
            initialNodes={graphNodes}
            onClose={() => setShowGraph(false)}
          />
        </Box>
      )}
    </Box>
  );
}
