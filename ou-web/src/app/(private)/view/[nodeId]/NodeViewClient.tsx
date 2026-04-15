'use client';

import { Box, Text, Stack, Paper, Group, Badge, Divider } from '@mantine/core';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { DOMAIN_VIEW_MAP } from '@/components/views/registry';

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '가계부', task: '할 일',
  emotion: '감정', idea: '아이디어', habit: '습관',
  knowledge: '지식', relation: '인물',
};

interface NodeViewClientProps {
  node: any;
  triples: Array<{ subject: string; predicate: string; object: string }>;
  sections: Array<{ id: string; heading: string; order_idx: number }>;
  sentences: Array<{ id: string; section_id: string; text: string; order_idx: number }>;
  viewTypeOverride?: string;
}

export function NodeViewClient({ node, triples, sections, sentences, viewTypeOverride }: NodeViewClientProps) {
  const viewType = viewTypeOverride || node.view_hint || DOMAIN_VIEW_MAP[node.domain];
  const date = node.created_at
    ? new Date(node.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  return (
    <Stack gap="lg" p="xl">
      {/* 데이터뷰 렌더링 (매칭되는 뷰가 있으면) */}
      {viewType && (
        <ViewRenderer viewType={viewType} nodes={[node]} />
      )}

      {/* 원문 */}
      {node.raw && (
        <Paper p="md" radius="md" style={{ border: '0.5px solid var(--mantine-color-default-border)' }}>
          <Stack gap="xs">
            <Text fz="xs" c="dimmed" fw={500}>원문</Text>
            <Text fz="sm" style={{ whiteSpace: 'pre-wrap' }}>{node.raw}</Text>
          </Stack>
        </Paper>
      )}

      {/* 구조화된 문장 */}
      {sections.length > 0 && (
        <Paper p="md" radius="md" style={{ border: '0.5px solid var(--mantine-color-default-border)' }}>
          <Stack gap="sm">
            <Text fz="xs" c="dimmed" fw={500}>구조</Text>
            {sections.map(sec => {
              const sectionSentences = sentences
                .filter(s => s.section_id === sec.id)
                .sort((a, b) => a.order_idx - b.order_idx);
              return (
                <Box key={sec.id}>
                  {sec.heading && (
                    <Text fz="sm" fw={600} mb={4}>{sec.heading}</Text>
                  )}
                  {sectionSentences.map(s => (
                    <Text key={s.id} fz="sm" c="dimmed" pl="sm">
                      {s.text}
                    </Text>
                  ))}
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* 트리플 (관계) */}
      {triples.length > 0 && (
        <Paper p="md" radius="md" style={{ border: '0.5px solid var(--mantine-color-default-border)' }}>
          <Stack gap="xs">
            <Text fz="xs" c="dimmed" fw={500}>관계</Text>
            {triples.map((t, i) => (
              <Group key={i} gap="xs">
                <Badge variant="light" color="gray" size="sm">{t.subject}</Badge>
                <Text fz="xs" c="dimmed">{t.predicate}</Text>
                <Badge variant="light" color="gray" size="sm">{t.object}</Badge>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      {/* 메타 정보 */}
      <Group gap="xs">
        {date && <Text fz="xs" c="dimmed">{date}</Text>}
        {node.confidence && (
          <>
            <Divider orientation="vertical" />
            <Text fz="xs" c="dimmed">{node.confidence}</Text>
          </>
        )}
        {node.domain && (
          <>
            <Divider orientation="vertical" />
            <Badge variant="light" color="gray" size="xs">
              {DOMAIN_LABELS[node.domain] || node.domain}
            </Badge>
          </>
        )}
      </Group>
    </Stack>
  );
}
