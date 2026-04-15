'use client';

import { useState } from 'react';
import { Box, Text, Stack, Group, Badge, Button, Loader } from '@mantine/core';
import { FileArrowDown, Globe, Eye } from '@phosphor-icons/react';
import { notifications } from '@mantine/notifications';
import type { OUFile } from '@/lib/ou-format/types';

interface OUFileViewerProps {
  file: OUFile;
  /** 가져오기 완료 후 콜백 */
  onImported?: (result: { nodes: number; views: number }) => void;
}

export function OUFileViewer({ file, onImported }: OUFileViewerProps) {
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  const nodeCount = file.nodes?.length ?? 0;
  const viewCount = file.views?.length ?? 0;
  const edgeCount = file.edges?.length ?? 0;

  // 도메인별 그룹
  const domainCounts = file.nodes?.reduce<Record<string, number>>((acc, node) => {
    const d = node.domain || '기타';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {}) ?? {};

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/import/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setImported(true);
      notifications.show({
        message: `기록 ${data.imported.nodes}개, 보기 ${data.imported.views}개를 가져왔어요.`,
        color: 'gray',
      });
      onImported?.(data.imported);
    } catch {
      notifications.show({
        message: '가져오기에 실패했어요.',
        color: 'gray',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <Group
        gap="xs"
        px="sm"
        py={8}
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '0.5px solid var(--mantine-color-default-border)',
        }}
      >
        <Globe size={14} weight="fill" />
        <Text fz="sm" fw={600}>
          {file.metadata?.title ?? '.ou 파일'}
        </Text>
        <Badge variant="light" color="gray" size="xs" ml="auto">
          v{file.version}
        </Badge>
      </Group>

      {/* 메타데이터 */}
      <Stack gap={4} px="sm" py="sm">
        {file.metadata?.owner && (
          <Group gap={6}>
            <Text fz="xs" c="dimmed">만든이</Text>
            <Text fz="xs">{file.metadata.owner}</Text>
          </Group>
        )}
        {file.metadata?.created && (
          <Group gap={6}>
            <Text fz="xs" c="dimmed">만든 날</Text>
            <Text fz="xs">{new Date(file.metadata.created).toLocaleDateString('ko-KR')}</Text>
          </Group>
        )}
        {file.metadata?.language && (
          <Group gap={6}>
            <Text fz="xs" c="dimmed">언어</Text>
            <Text fz="xs">{file.metadata.language}</Text>
          </Group>
        )}
      </Stack>

      {/* 요약 */}
      <Box
        px="sm"
        py="sm"
        style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <Text fz="sm" fw={500} mb={8}>
          이 파일의 기록 {nodeCount}개, 보기 {viewCount}개
        </Text>

        {/* 도메인별 뱃지 */}
        {Object.keys(domainCounts).length > 0 && (
          <Group gap={4} mb={8}>
            {Object.entries(domainCounts).map(([domain, count]) => (
              <Badge key={domain} variant="light" color="gray" size="xs">
                {domain} {count}
              </Badge>
            ))}
          </Group>
        )}

        {edgeCount > 0 && (
          <Text fz="xs" c="dimmed">
            연결 {edgeCount}개
          </Text>
        )}
      </Box>

      {/* 노드 목록 미리보기 */}
      {nodeCount > 0 && (
        <Stack
          gap={2}
          px="sm"
          pb="sm"
          style={{ maxHeight: 200, overflow: 'auto' }}
        >
          {file.nodes.slice(0, 10).map((node, i) => (
            <Group
              key={node.id || i}
              gap={6}
              px={8}
              py={4}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 6,
                border: '0.5px solid var(--mantine-color-default-border)',
              }}
            >
              <Badge variant="light" color="gray" size="xs" style={{ flexShrink: 0 }}>
                {node.domain || '기타'}
              </Badge>
              <Text fz="xs" truncate style={{ flex: 1 }}>
                {node.raw?.slice(0, 80) || '(내용 없음)'}
              </Text>
            </Group>
          ))}
          {nodeCount > 10 && (
            <Text fz="xs" c="dimmed" ta="center">
              ...외 {nodeCount - 10}개
            </Text>
          )}
        </Stack>
      )}

      {/* 보기 목록 */}
      {viewCount > 0 && (
        <Stack
          gap={2}
          px="sm"
          pb="sm"
          style={{ borderTop: '0.5px solid var(--mantine-color-default-border)', paddingTop: 8 }}
        >
          <Text fz="xs" c="dimmed" mb={2}>보기 목록</Text>
          {file.views.map((view, i) => (
            <Group key={view.id || i} gap={6}>
              <Eye size={12} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
              <Text fz="xs">{view.name}</Text>
              <Badge variant="outline" color="gray" size="xs">{view.viewType}</Badge>
            </Group>
          ))}
        </Stack>
      )}

      {/* 가져오기 버튼 */}
      <Box
        px="sm"
        py={8}
        style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <Button
          fullWidth
          variant="light"
          color="gray"
          size="xs"
          leftSection={importing ? <Loader size={12} /> : <FileArrowDown size={14} />}
          onClick={handleImport}
          disabled={imported || importing}
        >
          {imported ? '가져오기 완료' : '내 우주로 가져오기'}
        </Button>
      </Box>
    </Box>
  );
}
