import { createClient } from '@/lib/supabase/server';
import { getSignedViewUrl } from '@/lib/storage/r2';
import { FileViewer } from '@/components/viewers/FileViewer';
import { NodeViewClient } from './NodeViewClient';
import { VisibilityToggle } from '@/components/ui/VisibilityToggle';
import { ShareButton } from '@/components/ui/ShareButton';
import { notFound } from 'next/navigation';
import { Box, Title, Text, Stack, Group } from '@mantine/core';
import type { Metadata } from 'next';

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '가계부', task: '할 일',
  emotion: '감정', idea: '아이디어', habit: '습관',
  knowledge: '지식', relation: '인물',
};

export async function generateMetadata(
  { params }: { params: { nodeId: string } }
): Promise<Metadata> {
  const supabase = await createClient();
  const { data: node } = await supabase
    .from('data_nodes')
    .select('raw, domain, visibility')
    .eq('id', params.nodeId)
    .single();

  if (!node || node.visibility === 'private') {
    return { title: 'OU' };
  }

  const title = node.raw
    ? (node.raw.length > 60 ? node.raw.slice(0, 57) + '...' : node.raw)
    : 'OU';
  const domainLabel = DOMAIN_LABELS[node.domain] || node.domain || '';
  const description = domainLabel
    ? `${domainLabel} — OU에서 확인하세요.`
    : '대화하는 족족 데이터가 됩니다.';

  const ogImageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ouuniverse.com'}/api/og/${params.nodeId}`;

  return {
    title: `${title} — OU`,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      siteName: 'OU',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ViewPage({ params }: { params: { nodeId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: node } = await supabase
    .from('data_nodes')
    .select('*')
    .eq('id', params.nodeId)
    .single();

  if (!node) return notFound();

  // 비공개 노드는 본인만
  if (node.visibility === 'private' && node.user_id !== user?.id) {
    return notFound();
  }

  const isOwner = node.user_id === user?.id;
  const hasFile = !!node.source_file_url;

  // 파일이 있으면 서명 URL 생성
  const fileUrl = hasFile ? await getSignedViewUrl(node.source_file_url) : null;

  // 관련 노드(트리플 기반) 로드
  const { data: triples } = await supabase
    .from('triples')
    .select('subject, predicate, object')
    .eq('node_id', node.id)
    .limit(50);

  // sections + sentences 로드
  const { data: sections } = await supabase
    .from('sections')
    .select('id, heading, order_idx')
    .eq('node_id', node.id)
    .order('order_idx');

  const { data: sentences } = await supabase
    .from('sentences')
    .select('id, section_id, text, order_idx')
    .eq('node_id', node.id)
    .order('order_idx');

  return (
    <Stack gap={0} style={{ minHeight: '100vh' }}>
      <Box
        px="xl"
        py="md"
        style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={4}>
              {node.raw
                ? (node.raw.length > 80 ? node.raw.slice(0, 77) + '...' : node.raw)
                : DOMAIN_LABELS[node.domain] || '데이터'}
            </Title>
            <Text fz="xs" c="dimmed">
              {DOMAIN_LABELS[node.domain] || node.domain || ''}
              {node.source_file_type ? ` — ${node.source_file_type.toUpperCase()}` : ''}
            </Text>
          </Box>
          {isOwner && (
            <Group gap="sm">
              <ShareButton
                nodeId={node.id}
                title={node.raw ?? undefined}
              />
              <VisibilityToggle
                nodeId={node.id}
                currentVisibility={node.visibility ?? 'private'}
              />
            </Group>
          )}
        </Group>
      </Box>

      <Box style={{ flex: 1, overflow: 'auto' }}>
        {hasFile && fileUrl && node.source_file_type !== 'pdf' ? (
          <FileViewer
            url={fileUrl}
            fileType={node.source_file_type ?? 'unknown'}
          />
        ) : (
          <NodeViewClient
            node={{
              ...node,
              domain_data: {
                ...(node.domain_data as any ?? {}),
                ...(fileUrl ? { file_url: fileUrl } : {}),
              },
            }}
            triples={triples ?? []}
            sections={sections ?? []}
            sentences={sentences ?? []}
            viewTypeOverride={node.source_file_type === 'pdf' ? 'document' : undefined}
          />
        )}
      </Box>
    </Stack>
  );
}
