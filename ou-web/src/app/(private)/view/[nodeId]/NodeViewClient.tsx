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

  /* ── Section title style ── */
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: 'var(--ou-text-dimmed)',
    fontWeight: 500,
  };

  /* ── Card style ── */
  const cardStyle: React.CSSProperties = {
    background: 'transparent',
    border: '0.5px solid var(--ou-border-subtle)',
    borderRadius: 'var(--ou-radius-card)',
    boxShadow: 'var(--ou-glow-sm)',
  };

  return (
    <Stack gap="lg" p="xl">
      {/* 데이터뷰 렌더링 (매칭되는 뷰가 있으면) */}
      {viewType && (
        <ViewRenderer viewType={viewType} nodes={[node]} />
      )}

      {/* 원문 */}
      {node.raw && (
        <Paper p="md" radius="md" style={cardStyle}>
          <Stack gap="xs">
            <Text style={sectionTitleStyle}>원문</Text>
            <Text fz="sm" style={{ whiteSpace: 'pre-wrap', color: 'var(--ou-text-body)' }}>
              {node.raw}
            </Text>
          </Stack>
        </Paper>
      )}

      {/* 구조화된 문장 */}
      {sections.length > 0 && (
        <Paper p="md" radius="md" style={cardStyle}>
          <Stack gap="sm">
            <Text style={sectionTitleStyle}>구조</Text>
            {sections.map(sec => {
              const sectionSentences = sentences
                .filter(s => s.section_id === sec.id)
                .sort((a, b) => a.order_idx - b.order_idx);
              return (
                <Box key={sec.id}>
                  {sec.heading && (
                    <Text fz="sm" fw={600} mb={4} style={{ color: 'var(--ou-text-strong)' }}>
                      {sec.heading}
                    </Text>
                  )}
                  {sectionSentences.map(s => (
                    <Text key={s.id} fz="sm" pl="sm" style={{ color: 'var(--ou-text-body)' }}>
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
        <Paper p="md" radius="md" style={cardStyle}>
          <Stack gap="xs">
            <Text style={sectionTitleStyle}>관계</Text>
            {triples.map((t, i) => (
              <Group key={i} gap="xs">
                <Badge
                  variant="light"
                  color="gray"
                  size="sm"
                  style={{
                    background: 'var(--ou-surface-muted)',
                    border: '0.5px solid var(--ou-border-subtle)',
                    color: 'var(--ou-text-body)',
                  }}
                >
                  {t.subject}
                </Badge>
                <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>{t.predicate}</Text>
                <Badge
                  variant="light"
                  color="gray"
                  size="sm"
                  style={{
                    background: 'var(--ou-surface-muted)',
                    border: '0.5px solid var(--ou-border-subtle)',
                    color: 'var(--ou-text-body)',
                  }}
                >
                  {t.object}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      {/* 메타 정보 */}
      <Group gap="xs">
        {date && <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>{date}</Text>}
        {node.confidence && (
          <>
            <Divider orientation="vertical" color="var(--ou-border-subtle)" />
            <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>{node.confidence}</Text>
          </>
        )}
        {node.domain && (
          <>
            <Divider orientation="vertical" color="var(--ou-border-subtle)" />
            <Badge
              variant="light"
              color="gray"
              size="xs"
              style={{
                background: 'var(--ou-surface-muted)',
                border: '0.5px solid var(--ou-border-subtle)',
                color: 'var(--ou-text-dimmed)',
              }}
            >
              {DOMAIN_LABELS[node.domain] || node.domain}
            </Badge>
          </>
        )}
      </Group>
    </Stack>
  );
}
