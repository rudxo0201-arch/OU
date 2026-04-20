'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useYouTubePlayer, formatTime } from '@/hooks/useYouTubePlayer';
import { VideoOrb } from '@/components/youtube/VideoOrb';
import { CommentSection, type YouTubeComment } from '@/components/youtube/CommentSection';
import { formatViewCount, formatRelativeDate, type YTFeedVideo } from '@/lib/youtube/feed-crawler';
import { ArrowLeft, BookmarkSimple, ListBullets } from '@phosphor-icons/react';

const PLAYER_ID = 'yt-player-container';

interface VideoData {
  nodeId: string | null;
  title: string;
  channelName: string;
  viewCount: number | null;
  publishedAt: string | null;
  description: string | null;
  transcriptCorrected: string | null;
  commentDigest: string[];
}

export default function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [quotedComment, setQuotedComment] = useState<string | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<YTFeedVideo[]>([]);
  const [addedToCurriculum, setAddedToCurriculum] = useState(false);

  const { isReady, currentTime, duration, seekTo } = useYouTubePlayer(videoId, PLAYER_ID);

  // 행동 데이터: 시청 시작 시간 기록
  const watchStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  // 영상 진입 시 자동 수집 (이미 구축된 파이프라인 활용)
  useEffect(() => {
    if (!user || !videoId) return;

    const ingest = async () => {
      setIngesting(true);
      try {
        const res = await fetch('/api/ingest/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` }),
        });

        if (res.ok) {
          const data = await res.json();
          setVideoData({
            nodeId: data.nodeId ?? null,
            title: data.metadata?.title ?? '',
            channelName: data.metadata?.channelName ?? '',
            viewCount: null,
            publishedAt: null,
            description: null,
            transcriptCorrected: data.transcriptCorrected ?? null,
            commentDigest: data.commentDigest ?? [],
          });
        }
      } catch {
        // 수집 실패해도 영상은 재생
      } finally {
        setIngesting(false);
      }
    };

    ingest();

    // 관련 영상: 피드에서 랜덤 추천
    fetch('/api/youtube/feed')
      .then(r => r.json())
      .then(d => {
        const others = (d.videos ?? []).filter((v: YTFeedVideo) => v.videoId !== videoId);
        setRelatedVideos(others.slice(0, 10));
      })
      .catch(() => {});

    // 시청 시작 기록
    watchStartRef.current = Date.now();

    return () => {
      // 시청 시간 기록 (행동 데이터)
      const watchSeconds = Math.floor((Date.now() - watchStartRef.current) / 1000);
      if (watchSeconds > 5) {
        navigator.sendBeacon?.('/api/youtube/watch-event', JSON.stringify({
          videoId,
          watchSeconds,
          totalDuration: duration,
        }));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, videoId]);

  const handleAddToCurriculum = useCallback(async () => {
    if (!videoData?.nodeId) return;
    // CurriculumView와 연동: 영상 노드를 커리큘럼에 추가
    try {
      await fetch('/api/curriculum/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: videoData.nodeId }),
      });
      setAddedToCurriculum(true);
    } catch {}
  }, [videoData?.nodeId]);

  const comments: YouTubeComment[] = (videoData?.commentDigest ?? []).map(text => ({
    authorName: '댓글',
    text,
    likeCount: null,
  }));

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
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => router.push('/youtube')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ou-text-muted)', fontSize: 14, padding: '4px 8px',
            borderRadius: 'var(--ou-radius-sm)',
          }}
        >
          <ArrowLeft size={16} />
          피드
        </button>

        {videoData?.title && (
          <span style={{
            fontSize: 14, fontWeight: 500, color: 'var(--ou-text-strong)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {videoData.title}
          </span>
        )}

        {ingesting && (
          <span style={{ fontSize: 12, color: 'var(--ou-text-disabled)', flexShrink: 0 }}>
            분석 중...
          </span>
        )}
      </header>

      {/* 메인 레이아웃 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        gap: 0,
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 0 80px',
      }}>
        {/* 좌측: 플레이어 + 정보 + 댓글 + Orb */}
        <div style={{ padding: '20px 20px 0 24px', minWidth: 0 }}>
          {/* YouTube 플레이어 */}
          <div style={{
            position: 'relative',
            aspectRatio: '16/9',
            borderRadius: 'var(--ou-radius-lg)',
            overflow: 'hidden',
            background: '#000',
            boxShadow: 'var(--ou-neu-raised-lg)',
          }}>
            <div id={PLAYER_ID} style={{ width: '100%', height: '100%' }} />

            {/* 플레이어 준비 전 로딩 표시 */}
            {!isReady && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.5)',
                  animation: 'blink 1s ease-in-out infinite',
                }} />
              </div>
            )}
          </div>

          {/* 재생 진행바 (읽기전용, 타임스탬프 참조용) */}
          {isReady && duration > 0 && (
            <div style={{
              marginTop: 8,
              height: 2,
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(currentTime / duration) * 100}%`,
                background: 'var(--ou-text-muted)',
                transition: 'width 0.5s linear',
              }} />
            </div>
          )}

          {/* 영상 정보 */}
          {videoData && (
            <div style={{ marginTop: 16 }}>
              <h1 style={{
                fontSize: 18, fontWeight: 600,
                color: 'var(--ou-text-strong)', lineHeight: 1.4, margin: 0,
              }}>
                {videoData.title}
              </h1>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 8, flexWrap: 'wrap', gap: 8,
              }}>
                <div style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>
                  {videoData.channelName}
                  {videoData.viewCount && ` · ${formatViewCount(videoData.viewCount)}`}
                  {videoData.publishedAt && ` · ${formatRelativeDate(videoData.publishedAt)}`}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {isReady && duration > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  )}
                  <button
                    onClick={handleAddToCurriculum}
                    disabled={!videoData.nodeId || addedToCurriculum}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px',
                      borderRadius: 'var(--ou-radius-md)',
                      border: 'none',
                      background: 'var(--ou-bg)',
                      boxShadow: addedToCurriculum ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-md)',
                      fontSize: 13,
                      color: addedToCurriculum ? 'var(--ou-text-muted)' : 'var(--ou-text-body)',
                      cursor: videoData.nodeId && !addedToCurriculum ? 'pointer' : 'default',
                    }}
                  >
                    {addedToCurriculum ? <BookmarkSimple size={14} weight="fill" /> : <BookmarkSimple size={14} />}
                    {addedToCurriculum ? '추가됨' : '커리큘럼에 추가'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 댓글 섹션 */}
          <CommentSection
            comments={comments}
            onQuote={c => setQuotedComment(c.text)}
          />

          {/* Orb (댓글/Gemini 대체) */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              fontSize: 12, color: 'var(--ou-text-disabled)', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <ListBullets size={12} />
              인사이트, 질문, 댓글 인용을 기록하면 내 우주에 쌓여요
            </div>
            <VideoOrb
              videoId={videoId}
              nodeId={videoData?.nodeId ?? null}
              currentTime={currentTime}
              transcriptContext={videoData?.transcriptCorrected ?? null}
              quotedComment={quotedComment}
              onQuoteConsumed={() => setQuotedComment(null)}
            />
          </div>
        </div>

        {/* 우측: 추천 영상 */}
        <div style={{
          padding: '20px 24px 0 4px',
          borderLeft: '1px solid var(--ou-border-faint)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ou-text-muted)', marginBottom: 16 }}>
            다음 영상
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {relatedVideos.map(v => (
              <RelatedVideoCard
                key={v.videoId}
                video={v}
                onClick={() => router.push(`/youtube/${v.videoId}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 추천 영상 카드 ───────────────────────────────────────────────────────────

function RelatedVideoCard({ video, onClick }: { video: YTFeedVideo; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 10,
        cursor: 'pointer',
        borderRadius: 'var(--ou-radius-md)',
        padding: 8,
        background: 'var(--ou-bg)',
        boxShadow: hovered ? 'var(--ou-neu-raised-md)' : 'none',
        transition: 'box-shadow 150ms ease',
      }}
    >
      <div style={{
        width: 120, flexShrink: 0,
        aspectRatio: '16/9',
        borderRadius: 'var(--ou-radius-sm)',
        overflow: 'hidden',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--ou-text-strong)',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {video.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 4 }}>
          {video.channelName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)' }}>
          {formatRelativeDate(video.publishedAt)}
        </div>
      </div>
    </div>
  );
}
