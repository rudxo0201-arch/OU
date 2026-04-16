'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ViewProps } from './registry';

interface Chapter {
  title: string;
  start_time: number;
  end_time: number;
}

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

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TranscriptView({ nodes }: ViewProps) {
  const node = nodes?.[0];
  const domainData = node?.domain_data as Record<string, unknown> | undefined;

  const videoId = domainData?.video_id as string | undefined;
  const title = domainData?.title as string || node?.raw || '';
  const channelName = domainData?.channel_name as string || '';
  const chapters = (domainData?.chapters as Chapter[]) || [];

  const sections = (node as { sections?: { heading: string; sentences: { text: string; source_location?: { start_time: number; end_time: number } }[] }[] })?.sections || [];

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
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <span style={{ color: 'var(--ou-text-dimmed, #888)' }}>YouTube 영상 데이터가 없어요.</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* 영상 정보 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>{title}</span>
        {channelName && <span style={{ fontSize: 13, color: 'var(--ou-text-dimmed, #888)' }}>{channelName}</span>}
      </div>

      {/* 플레이어 */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#000',
          border: '0.5px solid var(--ou-border, #333)',
          marginBottom: 16,
        }}
      >
        <div ref={playerContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* 스크립트 */}
      {lines.length > 0 ? (
        <div
          style={{
            border: '0.5px solid var(--ou-border, #333)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', borderBottom: '0.5px solid var(--ou-border, #333)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ou-text-dimmed, #888)', textTransform: 'uppercase', letterSpacing: 1 }}>
              스크립트
            </span>
            <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{lines.length}줄</span>
          </div>

          <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '8px 0' }}>
              {lines.map((line, i) => {
                const isActive = i === activeIdx;
                const chapter = chapters.find(ch => Math.abs(ch.start_time - line.startTime) < 1);

                return (
                  <div key={i}>
                    {chapter && (
                      <div style={{ padding: i > 0 ? '12px 12px 4px' : '0 12px 4px' }}>
                        <div style={{ borderTop: '0.5px solid var(--ou-border, #333)', paddingTop: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-dimmed, #888)' }}>{chapter.title}</span>
                        </div>
                      </div>
                    )}
                    <div
                      ref={isActive ? activeLineRef : undefined}
                      onClick={() => handleSeek(line.startTime)}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                        transition: 'background 150ms',
                        padding: '4px 12px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--ou-text-dimmed, #888)',
                          width: 44,
                          flexShrink: 0,
                          fontVariantNumeric: 'tabular-nums',
                          fontFamily: 'monospace',
                          paddingTop: 2,
                        }}
                      >
                        {formatTime(line.startTime)}
                      </span>
                      <span
                        style={{ fontSize: 14, fontWeight: isActive ? 500 : 400, flex: 1, lineHeight: 1.7 }}
                      >
                        {line.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <span style={{ color: 'var(--ou-text-dimmed, #888)' }}>자막이 없는 영상이에요.</span>
        </div>
      )}
    </div>
  );
}
