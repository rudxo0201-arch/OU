'use client';

import { Box, Text, Group, Badge, UnstyledButton, Image } from '@mantine/core';
import { YoutubeLogo, ArrowRight } from '@phosphor-icons/react';
import { registerTool, type ToolProps } from './registry';

/** YouTube URL에서 video ID를 추출 */
function extractVideoId(url: string): string | null {
  // youtube.com/watch?v=ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/ID
  const shortMatch = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/ID
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
      <Box
        mt="xs"
        px="sm"
        py="sm"
        style={{
          border: '0.5px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-md)',
        }}
      >
        <Text fz="xs" c="dimmed">영상 주소를 인식하지 못했어요.</Text>
      </Box>
    );
  }

  return (
    <Box
      mt="xs"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
        animation: 'ou-fade-in 300ms ease',
      }}
    >
      {/* 헤더 */}
      <Group
        gap="xs"
        px="sm"
        py={6}
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '0.5px solid var(--mantine-color-default-border)',
        }}
      >
        <YoutubeLogo size={14} weight="fill" />
        <Badge variant="light" color="gray" size="xs">
          영상 인식
        </Badge>
      </Group>

      {/* 썸네일 */}
      {thumbnailUrl && (
        <Box px="sm" pt="sm">
          <Image
            src={thumbnailUrl}
            alt="영상 미리보기"
            radius="sm"
            maw={320}
            style={{ borderRadius: 8 }}
          />
        </Box>
      )}

      {/* 안내 */}
      <Box px="sm" py="sm">
        <Text fz="sm">영상 내용을 분석할게요</Text>
        <Text fz="xs" c="dimmed" mt={4}>
          자막을 읽고 주요 내용을 정리해 드려요.
        </Text>
      </Box>

      {/* 하단 */}
      <Group
        px="sm"
        py={6}
        justify="space-between"
        style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <UnstyledButton
          onClick={handleAnalyze}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--mantine-color-dimmed)',
          }}
        >
          분석 시작 <ArrowRight size={11} />
        </UnstyledButton>
      </Group>
    </Box>
  );
}

// Registry 등록
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
