'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from '@phosphor-icons/react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface TranscriptLine {
  text: string;
  startTime: number;
  endTime: number;
}

interface Chapter {
  title: string;
  startTime: number;
  endTime: number;
}

export interface YouTubeWorkspaceData {
  videoId: string;
  nodeId: string;
  metadata: {
    title: string;
    channelName: string;
    thumbnailUrl: string;
    duration: number | null;
    chapters: Chapter[];
  };
  transcript: TranscriptLine[];
  transcriptCorrected: string | null;
}

interface YouTubeWorkspaceProps {
  data: YouTubeWorkspaceData;
  onClose: () => void;
  children?: React.ReactNode; // Messages + ChatInput
}

// ─── 시간 포맷 ─────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── YouTube IFrame API 타입 ───────────────────────────────────────────────

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
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function YouTubeWorkspace({ data, onClose, children }: YouTubeWorkspaceProps) {
  const { videoId, metadata, transcript } = data;
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<YTPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const scriptViewportRef = useRef<HTMLDivElement>(null);

  // YouTube IFrame API 로드
  useEffect(() => {
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
            // 1초 간격 폴링
            timerRef.current = setInterval(() => {
              if (playerRef.current) {
                try {
                  setCurrentTime(playerRef.current.getCurrentTime());
                } catch { /* player not ready */ }
              }
            }, 1000);
          },
        },
      });
    };

    loadAPI();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
    };
  }, [videoId]);

  // 현재 재생 위치의 스크립트 라인으로 자동 스크롤
  useEffect(() => {
    if (activeLineRef.current && scriptViewportRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime]);

  const handleSeek = useCallback((time: number) => {
    playerRef.current?.seekTo(time, true);
    setCurrentTime(time);
  }, []);

  // 현재 활성 라인 인덱스
  const activeIdx = transcript.findIndex(
    (line, i) =>
      currentTime >= line.startTime &&
      (i === transcript.length - 1 || currentTime < transcript[i + 1].startTime),
  );

  // 챕터 시작 인덱스 맵
  const chapterStartTimes = new Set(
    metadata.chapters.map(ch => ch.startTime),
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--ou-glass-bg)',
        backdropFilter: 'blur(var(--ou-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--ou-glass-blur))',
        border: '0.5px solid var(--ou-glass-border)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '0.5px solid var(--ou-glass-border)',
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {metadata.title}
          </span>
          <span style={{ fontSize: 11, color: 'var(--mantine-color-dimmed)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {metadata.channelName}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--mantine-color-gray-6)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* 플레이어 */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          background: '#000',
          flexShrink: 0,
        }}
      >
        <div ref={playerContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* 스크립트 패널 */}
      {transcript.length > 0 ? (
        <div
          ref={scriptViewportRef}
          style={{ flex: 1, minHeight: 0, overflow: 'auto' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 8, paddingBottom: 8 }}>
            {transcript.map((line, i) => {
              const isActive = i === activeIdx;
              // 이 라인이 새 챕터의 시작인지 체크
              const chapter = metadata.chapters.find(
                ch => Math.abs(ch.startTime - line.startTime) < 1,
              );

              return (
                <div key={i}>
                  {chapter && (
                    <div style={{ padding: '0 12px', paddingTop: i > 0 ? 12 : 0, paddingBottom: 4 }}>
                      <div style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)', paddingBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--mantine-color-dimmed)' }}>
                          {chapter.title}
                        </span>
                      </div>
                    </div>
                  )}
                  <div
                    ref={isActive ? activeLineRef : undefined}
                    onClick={() => handleSeek(line.startTime)}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                      transition: 'background 150ms',
                      padding: '3px 12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--mantine-color-dimmed)',
                        width: 40,
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                        fontFamily: 'monospace',
                        paddingTop: 1,
                      }}
                    >
                      {formatTime(line.startTime)}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 500 : 400,
                        flex: 1,
                        lineHeight: 1.6,
                      }}
                    >
                      {line.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)' }}>자막이 없는 영상이에요</span>
        </div>
      )}

      {/* 채팅 영역 (ChatPanel에서 children으로 전달) */}
      {children && (
        <div style={{ borderTop: '0.5px solid var(--ou-glass-border)' }}>
          {children}
        </div>
      )}
    </div>
  );
}
