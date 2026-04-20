'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { YTFeedVideo } from '@/lib/youtube/feed-crawler';
import { formatViewCount, formatRelativeDate } from '@/lib/youtube/feed-crawler';
import { YoutubeLogo, MagnifyingGlass, Link as LinkIcon, SignOut, ArrowClockwise } from '@phosphor-icons/react';

export default function YouTubeFeedPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<YTFeedVideo[]>([]);
  const [connected, setConnected] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadFeed = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/youtube/feed');
      if (!res.ok) return;
      const data = await res.json();
      setVideos(data.videos ?? []);
      setConnected(data.connected ?? false);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) loadFeed();
  }, [user, loadFeed]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    // YouTube URL에서 videoId 추출
    const match = trimmed.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      router.push(`/youtube/${match[1]}`);
    }
  };

  const handleVideoClick = (video: YTFeedVideo) => {
    router.push(`/youtube/${video.videoId}`);
  };

  const handleDisconnect = async () => {
    await fetch('/api/auth/youtube/disconnect', { method: 'POST' });
    setConnected(false);
    setVideos([]);
  };

  const filteredVideos = searchQuery
    ? videos.filter(v =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.channelName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : videos;

  if (isLoading) return null;

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--ou-bg)',
      color: 'var(--ou-text-body)',
    }}>
      {/* 헤더 */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-raised-sm)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <YoutubeLogo size={28} weight="fill" style={{ color: 'var(--ou-text-strong)' }} />
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ou-text-strong)', letterSpacing: '-0.02em' }}>
            YouTube
          </span>
        </div>

        {/* 검색 */}
        <div style={{ flex: 1, maxWidth: 520, position: 'relative' }}>
          <MagnifyingGlass
            size={16}
            style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--ou-text-muted)', pointerEvents: 'none',
            }}
          />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="피드에서 검색..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 'var(--ou-radius-md)',
              border: 'none',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
              fontSize: 14,
              color: 'var(--ou-text-body)',
              outline: 'none',
            }}
          />
        </div>

        {/* URL 붙여넣기 */}
        <form onSubmit={handleUrlSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <LinkIcon
              size={14}
              style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--ou-text-muted)', pointerEvents: 'none',
              }}
            />
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="YouTube URL 붙여넣기..."
              style={{
                width: 220,
                padding: '8px 10px 8px 28px',
                borderRadius: 'var(--ou-radius-md)',
                border: 'none',
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-pressed-sm)',
                fontSize: 13,
                color: 'var(--ou-text-body)',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--ou-radius-md)',
              border: 'none',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-md)',
              fontSize: 13,
              color: 'var(--ou-text-body)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            열기
          </button>
        </form>

        {/* 연동 상태 */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {connected ? (
            <>
              <button
                onClick={loadFeed}
                title="새로고침"
                style={{
                  padding: 8, borderRadius: 'var(--ou-radius-md)', border: 'none',
                  background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  color: 'var(--ou-text-muted)',
                }}
              >
                <ArrowClockwise size={16} />
              </button>
              <button
                onClick={handleDisconnect}
                title="연동 해제"
                style={{
                  padding: 8, borderRadius: 'var(--ou-radius-md)', border: 'none',
                  background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  color: 'var(--ou-text-muted)',
                }}
              >
                <SignOut size={16} />
              </button>
            </>
          ) : (
            <a
              href="/api/auth/youtube"
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--ou-radius-md)',
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-raised-md)',
                fontSize: 13,
                color: 'var(--ou-text-body)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <YoutubeLogo size={14} weight="fill" />
              YouTube 연동
            </a>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main style={{ padding: '24px 24px 80px' }}>
        {fetching ? (
          <FeedSkeleton />
        ) : !connected ? (
          <ConnectPrompt />
        ) : filteredVideos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ou-text-muted)', fontSize: 14 }}>
            {searchQuery ? '검색 결과가 없어요' : '구독 채널의 새 영상이 없어요'}
          </div>
        ) : (
          <VideoGrid videos={filteredVideos} onVideoClick={handleVideoClick} />
        )}
      </main>
    </div>
  );
}

// ─── 비디오 그리드 ────────────────────────────────────────────────────────────

function VideoGrid({ videos, onVideoClick }: { videos: YTFeedVideo[]; onVideoClick: (v: YTFeedVideo) => void }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 20,
    }}>
      {videos.map(video => (
        <VideoCard key={video.videoId} video={video} onClick={() => onVideoClick(video)} />
      ))}
    </div>
  );
}

function VideoCard({ video, onClick }: { video: YTFeedVideo; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        borderRadius: 'var(--ou-radius-lg)',
        overflow: 'hidden',
        background: 'var(--ou-bg)',
        boxShadow: hovered ? 'var(--ou-neu-raised-lg)' : 'var(--ou-neu-raised-sm)',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* 썸네일 */}
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* 정보 */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--ou-text-strong)',
          lineHeight: 1.4,
          marginBottom: 6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {video.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', lineHeight: 1.6 }}>
          <div>{video.channelName}</div>
          <div>
            {video.viewCount !== null && `${formatViewCount(video.viewCount)} · `}
            {formatRelativeDate(video.publishedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 연동 안내 ────────────────────────────────────────────────────────────────

function ConnectPrompt() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 20,
      textAlign: 'center',
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-raised-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ou-text-muted)',
      }}>
        <YoutubeLogo size={32} weight="fill" />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ou-text-strong)', marginBottom: 8 }}>
          YouTube 피드 연동하기
        </div>
        <div style={{ fontSize: 14, color: 'var(--ou-text-muted)', maxWidth: 320, lineHeight: 1.6 }}>
          구독 채널의 최신 영상을 OU에서 바로 보세요.
          영상을 보면서 인사이트와 질문을 기록하면 내 우주에 쌓입니다.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <a
          href="/api/auth/youtube"
          style={{
            padding: '12px 28px',
            borderRadius: 'var(--ou-radius-md)',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-raised-lg)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ou-text-strong)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <YoutubeLogo size={16} weight="fill" />
          YouTube 계정 연동
        </a>
        <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)' }}>
          구독 채널 목록만 읽어옵니다. 다른 권한은 요청하지 않아요.
        </div>
      </div>
    </div>
  );
}

// ─── 스켈레톤 ─────────────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 20,
    }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          borderRadius: 'var(--ou-radius-lg)',
          overflow: 'hidden',
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-raised-sm)',
        }}>
          <div style={{
            aspectRatio: '16/9',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-pressed-sm)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 14, borderRadius: 4, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: 14, width: '70%', borderRadius: 4, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: 12, width: '50%', borderRadius: 4, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)', animation: 'pulse 1.5s ease-in-out infinite', marginTop: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
