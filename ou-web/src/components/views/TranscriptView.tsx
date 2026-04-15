'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Text, Stack, ScrollArea, Divider, Group } from '@mantine/core';
import type { ViewProps } from './registry';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Chapter {
  title: string;
  start_time: number;
  end_time: number;
}

// YouTube IFrame API
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        config: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: Record<string, (e: unknown) => void>;
        },
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function TranscriptView({ nodes }: ViewProps) {
  const node = nodes?.[0];
  const domainData = node?.domain_data as Record<string, unknown> | undefined;

  const videoId = domainData?.video_id as string | undefined;
  const title = domainData?.title as string || node?.raw || '';
  const channelName = domainData?.channel_name as string || '';
  const chapters = (domainData?.chapters as Chapter[]) || [];

  // sections/sentences에서 타임스탬프 추출
  const sections = (node as { sections?: { heading: string; sentences: { text: string; source_location?: { start_time: number; end_time: number } }[] }[] })?.sections || [];

  // flat transcript lines
  const lines = sections.flatMap(sec =>
    (sec.sentences || []).map(s => ({
      text: s.text,
      startTime: s.source_location?.start_time ?? 0,
      endTime: s.source_location?.end_time ?? 0,
      sectionHeading: sec.heading,
    })),
  );

  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoId) return;

    const loadAPI = () => {
      if (window.YT) {
        createPlayer();
        return;
      }
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = createPlayer;
    };

    const createPlayer = () => {
      if (!playerContainerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            timerRef.current = setInterval(() => {
              if (playerRef.current) {
                try { setCurrentTime(playerRef.current.getCurrentTime()); } catch { /* */ }
              }
            }, 1000);
          },
        },
      });
    };

    loadAPI();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { playerRef.current?.destroy(); } catch { /* */ }
    };
  }, [videoId]);

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentTime]);

  const handleSeek = useCallback((time: number) => {
    playerRef.current?.seekTo(time, true);
    setCurrentTime(time);
  }, []);

  const activeIdx = lines.findIndex(
    (line, i) =>
      currentTime >= line.startTime &&
      (i === lines.length - 1 || currentTime < lines[i + 1].startTime),
  );

  if (!videoId) {
    return (
      <Box py="xl">
        <Text c="dimmed" ta="center">YouTube 영상 데이터가 없어요.</Text>
      </Box>
    );
  }

  // 챕터 시작시간으로 구분선 표시용 set
  const chapterStartSet = new Set(chapters.map(ch => ch.start_time));

  return (
    <Box style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* 영상 정보 */}
      <Stack gap={4} mb="md">
        <Text fz={20} fw={700}>{title}</Text>
        {channelName && <Text fz="sm" c="dimmed">{channelName}</Text>}
      </Stack>

      {/* 플레이어 */}
      <Box
        mb="md"
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
          background: '#000',
          border: '0.5px solid var(--mantine-color-default-border)',
        }}
      >
        <div ref={playerContainerRef} style={{ width: '100%', height: '100%' }} />
      </Box>

      {/* 스크립트 */}
      {lines.length > 0 ? (
        <Box
          style={{
            border: '0.5px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-md)',
            overflow: 'hidden',
          }}
        >
          <Group px="sm" py={8} style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
            <Text fz={12} fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>
              스크립트
            </Text>
            <Text fz={11} c="dimmed">{lines.length}줄</Text>
          </Group>

          <ScrollArea style={{ maxHeight: '60vh' }}>
            <Stack gap={0} py="xs">
              {lines.map((line, i) => {
                const isActive = i === activeIdx;
                const chapter = chapters.find(ch => Math.abs(ch.start_time - line.startTime) < 1);

                return (
                  <Box key={i}>
                    {chapter && (
                      <Box px="sm" pt={i > 0 ? 'sm' : 0} pb={4}>
                        <Divider
                          label={<Text fz={11} fw={600} c="dimmed">{chapter.title}</Text>}
                          labelPosition="left"
                        />
                      </Box>
                    )}
                    <Box
                      ref={isActive ? activeLineRef : undefined}
                      onClick={() => handleSeek(line.startTime)}
                      px="sm"
                      py={4}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                        transition: 'background 150ms',
                      }}
                    >
                      <Text
                        fz={11}
                        c="dimmed"
                        style={{
                          width: 44,
                          flexShrink: 0,
                          fontVariantNumeric: 'tabular-nums',
                          fontFamily: 'monospace',
                          paddingTop: 2,
                        }}
                      >
                        {formatTime(line.startTime)}
                      </Text>
                      <Text
                        fz={14}
                        fw={isActive ? 500 : 400}
                        style={{ flex: 1, lineHeight: 1.7 }}
                      >
                        {line.text}
                      </Text>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </ScrollArea>
        </Box>
      ) : (
        <Box py="xl">
          <Text c="dimmed" ta="center">자막이 없는 영상이에요.</Text>
        </Box>
      )}
    </Box>
  );
}
