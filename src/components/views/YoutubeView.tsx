'use client';

/**
 * YoutubeView
 *
 * 뷰 레지스트리 등록용 래퍼.
 * source_type='youtube'인 DataNode를 받아 /youtube/[videoId]로 이동.
 *
 * ViewProps 인터페이스 준수 — 등록만으로 확장 가능.
 */

import { useRouter } from 'next/navigation';
import type { ViewProps } from './registry';
import { YoutubeLogo, Play } from '@phosphor-icons/react';

export function YoutubeView({ nodes }: ViewProps) {
  const router = useRouter();

  const youtubeNodes = nodes.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n: any) => n.source_type === 'youtube' || n.domain_data?.video_id
  );

  if (youtubeNodes.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 200, gap: 12, color: 'var(--ou-text-muted)',
      }}>
        <YoutubeLogo size={32} weight="fill" />
        <div style={{ fontSize: 14 }}>수집된 YouTube 영상이 없어요</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      gap: 16,
      padding: 16,
    }}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {youtubeNodes.map((node: any) => {
        const videoId = node.domain_data?.video_id;
        const title = node.domain_data?.title ?? node.title ?? '제목 없음';
        const channelName = node.domain_data?.channel ?? '';
        const thumbnail = videoId
          ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
          : null;

        return (
          <div
            key={node.id}
            onClick={() => videoId && router.push(`/youtube/${videoId}`)}
            style={{
              cursor: videoId ? 'pointer' : 'default',
              borderRadius: 'var(--ou-radius-lg)',
              overflow: 'hidden',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-sm)',
              transition: 'box-shadow 150ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--ou-neu-raised-lg)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--ou-neu-raised-sm)';
            }}
          >
            {/* 썸네일 */}
            <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)' }}>
              {thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnail} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)',
                opacity: 0,
                transition: 'opacity 150ms ease',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; }}
              >
                <Play size={32} weight="fill" color="white" />
              </div>
            </div>

            {/* 정보 */}
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{
                fontSize: 13, fontWeight: 500, color: 'var(--ou-text-strong)',
                lineHeight: 1.4, marginBottom: 4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>{channelName}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
