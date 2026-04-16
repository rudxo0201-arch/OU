'use client';

import { YoutubeLogo, ArrowRight } from '@phosphor-icons/react';
import { registerTool, type ToolProps } from './registry';

/** YouTube URL에서 video ID를 추출 */
function extractVideoId(url: string): string | null {
  const watchMatch = url.match(/(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = url.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

const YOUTUBE_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed\/)/;

export function YouTubeTool({ parsed, onSubmit }: ToolProps) {
  const videoId = parsed.videoId;
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/0.jpg`
    : null;

  const handleAnalyze = () => {
    onSubmit(`영상 분석 요청: https://youtube.com/watch?v=${videoId}`);
  };

  if (!videoId) {
    return (
      <div
        style={{
          marginTop: 8, padding: '8px 12px',
          border: '0.5px solid var(--color-default-border)', borderRadius: 8,
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--color-dimmed)' }}>영상 주소를 인식하지 못했어요.</span>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 8, border: '0.5px solid var(--color-default-border)',
        borderRadius: 8, overflow: 'hidden', animation: 'ou-fade-in 300ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255, 255, 255, 0.04)', borderBottom: '0.5px solid var(--color-default-border)' }}>
        <YoutubeLogo size={14} weight="fill" />
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f3f4f6', color: '#6b7280' }}>영상 인식</span>
      </div>

      {thumbnailUrl && (
        <div style={{ padding: '8px 12px 0' }}>
          <img src={thumbnailUrl} alt="영상 미리보기" style={{ borderRadius: 8, maxWidth: 320, width: '100%' }} />
        </div>
      )}

      <div style={{ padding: '8px 12px' }}>
        <span style={{ fontSize: 14, display: 'block' }}>영상 내용을 분석할게요</span>
        <span style={{ fontSize: 12, color: 'var(--color-dimmed)', marginTop: 4, display: 'block' }}>
          자막을 읽고 주요 내용을 정리해 드려요.
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderTop: '0.5px solid var(--color-default-border)' }}>
        <button onClick={handleAnalyze}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-dimmed)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          분석 시작 <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

registerTool({
  id: 'youtube',
  label: '영상',
  match: (input) => YOUTUBE_URL_REGEX.test(input),
  parse: (input) => {
    const urlMatch = input.match(/https?:\/\/[^\s]+/);
    const videoId = urlMatch ? extractVideoId(urlMatch[0]) : null;
    return { videoId: videoId ?? '', url: urlMatch?.[0] ?? '' };
  },
  component: YouTubeTool,
});
