'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Box, Stack, ScrollArea, ActionIcon, Text } from '@mantine/core';
import { CaretRight, CaretLeft } from '@phosphor-icons/react';
import { ChatInput, type ImageUploadResult, type FileUploadResult } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { TokenGauge } from './TokenGauge';
import { ScenarioSuggestions } from './ScenarioSuggestions';
import { YouTubeWorkspace, type YouTubeWorkspaceData } from './YouTubeWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/stores/chatStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { getScenariosByStage, type Scenario } from '@/data/scenarios';
import { extractDomainData } from '@/lib/pipeline/extract-domain-data';
import { ViewRecommendBadge } from './ViewRecommendBadge';
import { DOMAIN_VIEW_MAP } from '@/components/views/registry';

const YOUTUBE_URL_RE = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

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

interface ChatPanelProps {
  /** Called when a new node is created via chat */
  onNodeCreated?: (node: { id: string; domain: string; raw: string }) => void;
}

export function ChatPanel({ onNodeCreated }: ChatPanelProps) {
  const { user } = useAuth();
  const { messages, addMessage, turnCount } = useChatStore();
  const { chatPanelOpen, toggleChatPanel } = useNavigationStore();
  const [streaming, setStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [youtubeMode, setYoutubeMode] = useState<YouTubeWorkspaceData | null>(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Onboarding greeting
  const onboardingDone = useRef(false);
  useEffect(() => {
    if (onboardingDone.current) return;
    if (messages.length === 0) {
      onboardingDone.current = true;
      addMessage({
        id: 'onboarding',
        role: 'assistant',
        content: '안녕하세요! 저는 OU예요. 무엇이든 편하게 말씀해주세요.',
        createdAt: new Date(),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [scenarioUsed, setScenarioUsed] = useState(false);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const scenarioStage = !user ? 'guest' : 'onboarding';
  const scenarios = useMemo(() => getScenariosByStage(scenarioStage), [scenarioStage]);
  const showScenarios = messages.length <= 1 && !scenarioUsed;

  const guestLimitReached = !user && turnCount >= 10;

  // 뷰 추천 로직
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach(m => {
      if (m.nodeCreated?.domain) {
        counts[m.nodeCreated.domain] = (counts[m.nodeCreated.domain] || 0) + 1;
      }
    });
    return counts;
  }, [messages]);

  const viewRecommendation = useMemo(() => {
    if (activeScenario) {
      const view = activeScenario.expectedViews[0];
      if (view) return { domain: activeScenario.domain, viewType: view };
    }
    for (const [domain, count] of Object.entries(domainCounts)) {
      const threshold = domain === 'knowledge' ? 5 : 3;
      if (count >= threshold && DOMAIN_VIEW_MAP[domain]) {
        return { domain, viewType: DOMAIN_VIEW_MAP[domain] };
      }
    }
    return null;
  }, [domainCounts, activeScenario]);

  const lastRecommended = useRef<string | null>(null);
  const showViewRecommend = viewRecommendation && viewRecommendation.viewType !== lastRecommended.current;

  const handleSend = async (text: string, imageResult?: ImageUploadResult, fileResult?: FileUploadResult) => {
    if (!text.trim() || streaming) return;
    if (guestLimitReached) return;

    // YouTube URL 단독 입력 감지 → 워크스페이스 모드 전환
    const trimmed = text.trim();
    const ytMatch = trimmed.match(YOUTUBE_URL_RE);
    const isUrlOnly = ytMatch && trimmed.replace(/https?:\/\/[^\s]+/, '').trim() === '';

    if (isUrlOnly && ytMatch && !youtubeLoading) {
      addMessage({ id: Date.now().toString(), role: 'user', content: text, createdAt: new Date() });
      const loadingId = (Date.now() + 1).toString();
      addMessage({ id: loadingId, role: 'assistant', content: '스크립트를 가져오고 있어요...', createdAt: new Date(), streaming: true });
      setYoutubeLoading(true);

      try {
        const res = await fetch('/api/ingest/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = await res.json();

        if (res.ok && data.nodeId) {
          useChatStore.getState().updateMessage(loadingId, { content: '영상을 불러왔어요!', streaming: false });
          setYoutubeMode({
            videoId: ytMatch[1],
            nodeId: data.nodeId,
            metadata: data.metadata,
            transcript: data.transcript,
            transcriptCorrected: data.transcriptCorrected,
          });
          onNodeCreated?.({ id: data.nodeId, domain: data.domain, raw: data.metadata.title });
        } else {
          useChatStore.getState().updateMessage(loadingId, {
            content: data.error || '영상을 불러오지 못했어요.',
            streaming: false,
          });
        }
      } catch {
        useChatStore.getState().updateMessage(loadingId, {
          content: '영상을 불러오는 중 오류가 발생했어요.',
          streaming: false,
        });
      } finally {
        setYoutubeLoading(false);
      }
      return;
    }

    const userMsg = {
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

    const controller = new AbortController();
    setAbortController(controller);
    setStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    addMessage({ id: assistantId, role: 'assistant', content: '', createdAt: new Date(), streaming: true });

    const chatHistory = useChatStore.getState().messages
      .filter(m => m.id !== 'onboarding' && m.id !== assistantId && m.id !== userMsg.id)
      .map(m => ({ role: m.role, content: m.content }));

    // 워크스페이스 모드: transcript를 system context로 추가
    const youtubeContext = youtubeMode?.transcriptCorrected
      ? `[이 대화는 YouTube 영상 "${youtubeMode.metadata.title}" 시청 중입니다]\n[영상 스크립트]\n${youtubeMode.transcriptCorrected}\n\n`
      : '';

    const apiUserContent = imageResult
      ? `[사용자가 이미지를 보냈습니다: ${imageResult.fileName}]\n이미지 종류: ${imageResult.imageType}\n이미지 내용:\n${imageResult.text}`
      : youtubeContext ? `${youtubeContext}${text}` : text;

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

      if (res.status === 429) {
        useChatStore.getState().updateMessage(assistantId, {
          content: '사용량을 모두 사용했어요. 업그레이드하면 더 많이 쓸 수 있어요.',
          streaming: false,
        });
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
              const domain = data.domain || classifyDomainClient(text);
              const nodeId = data.nodeId || `local-${Date.now()}`;
              const domain_data = extractDomainData(text, domain);

              useChatStore.getState().updateMessage(assistantId, {
                streaming: false,
                nodeCreated: { domain, nodeId, confidence: data.confidence, domain_data },
              });

              onNodeCreated?.({ id: nodeId, domain, raw: text });
            }
          } catch {
            // skip
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
    const msgs = useChatStore.getState().messages;
    const streamingMsg = msgs.find(m => m.streaming);
    if (streamingMsg) {
      useChatStore.getState().updateMessage(streamingMsg.id, { streaming: false });
    }
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setScenarioUsed(true);
    handleSend(scenario.prompt);
  };

  // Collapsed state — show toggle button only
  if (!chatPanelOpen) {
    return (
      <Box
        style={{
          width: 40,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={toggleChatPanel}
          style={{
            background: 'var(--ou-glass-bg)',
            backdropFilter: 'blur(var(--ou-glass-blur))',
            border: '0.5px solid var(--ou-glass-border)',
            borderRadius: 'var(--mantine-radius-md)',
          }}
        >
          <CaretRight size={18} />
        </ActionIcon>
      </Box>
    );
  }

  // YouTube 워크스페이스 모드
  if (youtubeMode) {
    return (
      <Box style={{ width: 360, minWidth: 300, height: '100%' }}>
        <YouTubeWorkspace
          data={youtubeMode}
          onClose={() => setYoutubeMode(null)}
        >
          {/* 워크스페이스 내 채팅 영역 */}
          <ScrollArea style={{ maxHeight: 200 }} viewportRef={viewport}>
            <Stack gap="xs" px="sm" py="xs">
              {messages.filter(m => m.id !== 'onboarding').slice(-10).map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onAddInfo={handleSend}
                />
              ))}
            </Stack>
          </ScrollArea>
          <Box px="sm" pb="sm" pt={4}>
            <ChatInput
              onSend={handleSend}
              onStop={handleStop}
              streaming={streaming}
              disabled={guestLimitReached}
              loggedIn={!!user}
            />
          </Box>
        </YouTubeWorkspace>
      </Box>
    );
  }

  return (
    <Box
      style={{
        width: 360,
        minWidth: 300,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--ou-glass-bg)',
        backdropFilter: 'blur(var(--ou-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--ou-glass-blur))',
        border: '0.5px solid var(--ou-glass-border)',
        borderRadius: 16,
        position: 'relative',
      }}
    >
      {/* Header */}
      <Box
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '0.5px solid var(--ou-glass-border)',
        }}
      >
        <Text size="sm" fw={600}>Chat</Text>
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={toggleChatPanel}>
          <CaretRight size={16} />
        </ActionIcon>
      </Box>

      {/* Messages */}
      <ScrollArea flex={1} viewportRef={viewport}>
        <Stack gap="md" p="md" pb="xl">
          {showScenarios && (
            <ScenarioSuggestions scenarios={scenarios} onSelect={handleScenarioSelect} />
          )}
          {messages.map((msg, idx) => {
            const isLastAssistant = msg.role === 'assistant' && !msg.streaming && idx === messages.length - 1;
            const shouldShowViewRecommend = isLastAssistant && showViewRecommend;

            return (
              <Box key={msg.id}>
                <MessageBubble
                  message={msg}
                  onAddInfo={handleSend}
                />
                {shouldShowViewRecommend && viewRecommendation && (
                  <Box mt="xs">
                    <ViewRecommendBadge
                      domain={viewRecommendation.domain}
                      viewType={viewRecommendation.viewType}
                      nodes={messages
                        .filter(m => m.nodeCreated?.domain === viewRecommendation.domain)
                        .map(m => ({ id: m.nodeCreated?.nodeId, domain: m.nodeCreated?.domain, raw: m.content, domain_data: m.nodeCreated?.domain_data }))}
                    />
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      </ScrollArea>

      {/* Input */}
      <Box p="sm" style={{ borderTop: '0.5px solid var(--ou-glass-border)' }}>
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
    </Box>
  );
}
