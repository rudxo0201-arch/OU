'use client';
import { DOMAINS } from '@/lib/ou-registry';

/**
 * YoutubeView
 *
 * 모드 A (라이브러리): URL 입력 + 채널 사이드바 + 영상 그리드
 * 모드 B (플레이어): YoutubePlayerPanel — OrbShell 이탈 없음
 */

import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';
import { YoutubeLogo, Play, Link } from '@phosphor-icons/react';
import { YoutubePlayerPanel } from '@/components/youtube/YoutubePlayerPanel';

function extractVideoId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

export function YoutubeView({ nodes }: ViewProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');

  const youtubeNodes = useMemo(() =>
    nodes.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (n: any) => n.source_type === DOMAINS.YOUTUBE || n.domain_data?.video_id
    ),
    [nodes]
  );

  const channels = useMemo(() => {
    const counts: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const n of youtubeNodes as any[]) {
      const ch = n.domain_data?.channel || '기타';
      counts[ch] = (counts[ch] || 0) + 1;
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [youtubeNodes]);

  const filtered = useMemo(() =>
    selectedChannel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? youtubeNodes.filter((n: any) => (n.domain_data?.channel || '기타') === selectedChannel)
      : youtubeNodes,
    [youtubeNodes, selectedChannel]
  );

  // 모드 B: 플레이어
  if (selectedVideoId) {
    return (
      <YoutubePlayerPanel
        videoId={selectedVideoId}
        onClose={() => setSelectedVideoId(null)}
      />
    );
  }

  // 모드 A: 라이브러리
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(urlInput.trim());
    if (id) {
      setSelectedVideoId(id);
      setUrlInput('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* URL 입력 바 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--ou-border-faint)',
        flexShrink: 0,
      }}>
        <form onSubmit={handleUrlSubmit} style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px',
            background: 'var(--ou-bg)',
            border: '1px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-md)',
          }}>
            <Link size={14} color="var(--ou-text-muted)" />
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="YouTube URL 또는 영상 ID 붙여넣기"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: 'var(--ou-text-body)',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!urlInput.trim()}
            style={{
              padding: '7px 14px',
              background: 'var(--ou-text-body)',
              color: 'var(--ou-bg)',
              border: 'none',
              borderRadius: 'var(--ou-radius-md)',
              fontSize: 13, fontWeight: 500,
              cursor: urlInput.trim() ? 'pointer' : 'default',
              opacity: urlInput.trim() ? 1 : 0.4,
            }}
          >
            재생
          </button>
        </form>
      </div>

      {youtubeNodes.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, color: 'var(--ou-text-muted)',
        }}>
          <YoutubeLogo size={40} weight="light" />
          <div style={{ fontSize: 14 }}>수집된 YouTube 영상이 없어요</div>
          <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)' }}>위에 YouTube 링크를 붙여넣어 시작해보세요</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* 좌측 채널 사이드바 */}
          <div style={{
            width: 200, flexShrink: 0,
            borderRight: '1px solid var(--ou-glass-border)',
            overflowY: 'auto',
            padding: '16px 8px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <div style={{ padding: '4px 10px 12px', borderBottom: '1px solid var(--ou-glass-border)', marginBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ou-text-heading)' }}>
                {youtubeNodes.length}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                영상 · {channels.length}채널
              </div>
            </div>

            <button
              onClick={() => setSelectedChannel(null)}
              style={{
                textAlign: 'left', padding: '7px 10px', borderRadius: 6, border: 'none',
                background: selectedChannel === null ? 'var(--ou-glass-active)' : 'transparent',
                cursor: 'pointer', fontSize: 12,
                color: selectedChannel === null ? 'var(--ou-text-heading)' : 'var(--ou-text-body)',
                fontWeight: selectedChannel === null ? 600 : 400,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span>전체</span>
              <span style={{ fontSize: 10, color: 'var(--ou-text-muted)' }}>{youtubeNodes.length}</span>
            </button>

            {channels.map(([channel, count]) => (
              <button
                key={channel}
                onClick={() => setSelectedChannel(channel)}
                style={{
                  textAlign: 'left', padding: '7px 10px', borderRadius: 6, border: 'none',
                  background: selectedChannel === channel ? 'var(--ou-glass-active)' : 'transparent',
                  cursor: 'pointer', fontSize: 12,
                  color: selectedChannel === channel ? 'var(--ou-text-heading)' : 'var(--ou-text-body)',
                  fontWeight: selectedChannel === channel ? 600 : 400,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {channel}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ou-text-muted)', flexShrink: 0 }}>{count}</span>
              </button>
            ))}
          </div>

          {/* 우측 영상 그리드 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
            {selectedChannel && (
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-heading)', marginBottom: 16 }}>
                {selectedChannel}
                <span style={{ fontWeight: 400, color: 'var(--ou-text-muted)', marginLeft: 8 }}>
                  {filtered.length}개
                </span>
              </div>
            )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(filtered as any[]).map((node) => {
                const videoId = node.domain_data?.video_id;
                const title = node.domain_data?.title ?? node.title ?? '제목 없음';
                const channelName = node.domain_data?.channel ?? '';
                const dur = node.domain_data?.duration;
                const thumbnail = videoId
                  ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                  : null;

                return (
                  <div
                    key={node.id}
                    onClick={() => videoId && setSelectedVideoId(videoId)}
                    style={{
                      cursor: videoId ? 'pointer' : 'default',
                      borderRadius: 'var(--ou-radius-card)',
                      overflow: 'hidden',
                      background: 'var(--ou-glass)',
                      border: '1px solid var(--ou-glass-border)',
                      boxShadow: 'var(--ou-shadow-sm)',
                      transition: 'box-shadow 150ms ease, transform 150ms ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--ou-shadow-md)';
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--ou-shadow-sm)';
                      (e.currentTarget as HTMLDivElement).style.transform = 'none';
                    }}
                  >
                    {/* 썸네일 */}
                    <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--ou-border-faint)', overflow: 'hidden' }}>
                      {thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbnail} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      )}
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.25)',
                        opacity: 0,
                        transition: 'opacity 150ms ease',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Play size={18} weight="fill" color="#111" />
                        </div>
                      </div>
                      {dur && (
                        <div style={{
                          position: 'absolute', bottom: 6, right: 6,
                          background: 'rgba(0,0,0,0.75)', color: '#fff',
                          fontSize: 10, padding: '1px 5px', borderRadius: 3, fontVariantNumeric: 'tabular-nums',
                        }}>
                          {dur}
                        </div>
                      )}
                    </div>

                    {/* 정보 */}
                    <div style={{ padding: '10px 12px 12px' }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--ou-text-strong)',
                        lineHeight: 1.4, marginBottom: 5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {title}
                      </div>
                      {channelName && (
                        <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{channelName}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
