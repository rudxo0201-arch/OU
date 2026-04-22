'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useYouTubePlayer, formatTime } from '@/hooks/useYouTubePlayer';
import { VideoOrb } from '@/components/youtube/VideoOrb';
import { CommentSection, type YouTubeComment } from '@/components/youtube/CommentSection';
import { ArrowLeft, BookmarkSimple, ListBullets } from '@phosphor-icons/react';

const PLAYER_ID = 'yt-player-panel-container';

interface VideoData {
  nodeId: string | null;
  title: string;
  channelName: string;
  transcriptCorrected: string | null;
  commentDigest: string[];
}

interface Props {
  videoId: string;
  onClose: () => void;
}

export function YoutubePlayerPanel({ videoId, onClose }: Props) {
  const { user } = useAuth();
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [quotedComment, setQuotedComment] = useState<string | null>(null);
  const [addedToCurriculum, setAddedToCurriculum] = useState(false);

  const { isReady, currentTime, duration } = useYouTubePlayer(videoId, PLAYER_ID);

  const watchStartRef = useRef<number>(Date.now());

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
    watchStartRef.current = Date.now();

    return () => {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 패널 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderBottom: '1px solid var(--ou-border-faint)',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ou-text-muted)', fontSize: 13, padding: '4px 8px',
            borderRadius: 'var(--ou-radius-sm)',
          }}
        >
          <ArrowLeft size={15} />
          뒤로
        </button>
        {videoData?.title && (
          <span style={{
            fontSize: 13, fontWeight: 500, color: 'var(--ou-text-strong)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {videoData.title}
          </span>
        )}
        {ingesting && (
          <span style={{ fontSize: 11, color: 'var(--ou-text-disabled)', flexShrink: 0 }}>
            분석 중...
          </span>
        )}
      </div>

      {/* 메인 레이아웃: 좌측 플레이어+댓글, 우측 VideoOrb */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* 좌측: 플레이어 + 영상 정보 + 댓글 */}
        <div style={{ overflowY: 'auto', padding: '20px 20px 32px 20px', minWidth: 0 }}>
          {/* YouTube 플레이어 */}
          <div style={{
            position: 'relative',
            aspectRatio: '16/9',
            borderRadius: 'var(--ou-radius-lg)',
            overflow: 'hidden',
            background: '#000',
            boxShadow: 'var(--ou-shadow-md)',
          }}>
            <div id={PLAYER_ID} style={{ width: '100%', height: '100%' }} />
            {!isReady && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.5)',
                }} />
              </div>
            )}
          </div>

          {/* 진행바 */}
          {isReady && duration > 0 && (
            <div style={{
              marginTop: 8, height: 2,
              background: 'var(--ou-border-faint)',
              borderRadius: 2, overflow: 'hidden',
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
            <div style={{ marginTop: 14 }}>
              <h2 style={{
                fontSize: 16, fontWeight: 600,
                color: 'var(--ou-text-strong)', lineHeight: 1.4, margin: 0,
              }}>
                {videoData.title}
              </h2>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 8, flexWrap: 'wrap', gap: 8,
              }}>
                <div style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>
                  {videoData.channelName}
                  {isReady && duration > 0 && ` · ${formatTime(currentTime)} / ${formatTime(duration)}`}
                </div>
                <button
                  onClick={handleAddToCurriculum}
                  disabled={!videoData.nodeId || addedToCurriculum}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px',
                    borderRadius: 'var(--ou-radius-md)',
                    border: '1px solid var(--ou-border-subtle)',
                    background: 'var(--ou-bg)',
                    fontSize: 12,
                    color: addedToCurriculum ? 'var(--ou-text-muted)' : 'var(--ou-text-body)',
                    cursor: videoData.nodeId && !addedToCurriculum ? 'pointer' : 'default',
                  }}
                >
                  {addedToCurriculum ? <BookmarkSimple size={13} weight="fill" /> : <BookmarkSimple size={13} />}
                  {addedToCurriculum ? '추가됨' : '커리큘럼에 추가'}
                </button>
              </div>
            </div>
          )}

          {/* 댓글 섹션 */}
          <CommentSection
            comments={comments}
            onQuote={c => setQuotedComment(c.text)}
          />
        </div>

        {/* 우측: VideoOrb */}
        <div style={{
          borderLeft: '1px solid var(--ou-border-faint)',
          overflowY: 'auto',
          padding: '20px 16px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{
            fontSize: 11, color: 'var(--ou-text-disabled)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <ListBullets size={11} />
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
    </div>
  );
}
