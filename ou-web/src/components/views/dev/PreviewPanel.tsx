'use client';

import { Box, Group, Text, ActionIcon, Stack } from '@mantine/core';
import { ArrowClockwise, Globe, ArrowSquareOut } from '@phosphor-icons/react';
import { useRef } from 'react';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';

/**
 * WebContainer 라이브 프리뷰
 * dev server가 시작되면 자동으로 URL 감지하여 iframe에 표시
 */
export function PreviewPanel() {
  const { previewUrl, webcontainerStatus } = useDevWorkspaceStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!previewUrl) {
    return (
      <Stack align="center" justify="center" h="100%" gap="xs">
        <Globe size={28} color="var(--mantine-color-dark-3)" />
        <Text fz={11} c="dimmed" ta="center" maw={200}>
          {webcontainerStatus === 'ready'
            ? '터미널에서 dev server를 실행하면 여기에 표시됩니다'
            : '프로젝트 로드 중...'}
        </Text>
      </Stack>
    );
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 주소 바 */}
      <Group
        gap="xs"
        px="xs"
        py={4}
        style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
        wrap="nowrap"
      >
        <Globe size={12} color="var(--mantine-color-green-5)" />
        <Text fz={10} c="dimmed" style={{ flex: 1 }} truncate>
          {previewUrl}
        </Text>
        <ActionIcon
          size="xs"
          variant="subtle"
          onClick={() => iframeRef.current?.contentWindow?.location.reload()}
        >
          <ArrowClockwise size={10} />
        </ActionIcon>
        <ActionIcon
          size="xs"
          variant="subtle"
          onClick={() => window.open(previewUrl, '_blank')}
        >
          <ArrowSquareOut size={10} />
        </ActionIcon>
      </Group>

      {/* 프리뷰 iframe */}
      <Box style={{ flex: 1, minHeight: 0 }}>
        <iframe
          ref={iframeRef}
          src={previewUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#fff',
            borderRadius: '0 0 4px 4px',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </Box>
    </Box>
  );
}
