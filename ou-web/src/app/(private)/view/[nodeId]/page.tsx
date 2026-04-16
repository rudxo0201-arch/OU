import { createClient } from '@/lib/supabase/server';
import { getSignedViewUrl } from '@/lib/storage/r2';
import { FileViewer } from '@/components/viewers/FileViewer';
import { NodeViewClient } from './NodeViewClient';
import { VisibilityToggle } from '@/components/ui/VisibilityToggle';
import { ShareButton } from '@/components/ui/ShareButton';
import { notFound } from 'next/navigation';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100vh', background: 'transparent' }}>
      <div
        style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--ou-border-faint)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h4 style={{ color: 'var(--ou-text-strong)', margin: 0, fontSize: 18, fontWeight: 600 }}>
              {node.raw
                ? (node.raw.length > 80 ? node.raw.slice(0, 77) + '...' : node.raw)
                : DOMAIN_LABELS[node.domain] || '데이터'}
            </h4>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  background: 'var(--ou-surface-muted)',
                  border: '0.5px solid var(--ou-border-subtle)',
                  borderRadius: 'var(--ou-radius-pill)',
                  color: 'var(--ou-text-dimmed)',
                }}
              >
                {DOMAIN_LABELS[node.domain] || node.domain || ''}
              </span>
              {node.source_file_type && (
                <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
                  {node.source_file_type.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          {isOwner && (
            <div style={{ display: 'flex', gap: 12 }}>
              <ShareButton
                nodeId={node.id}
                title={node.raw ?? undefined}
              />
              <VisibilityToggle
                nodeId={node.id}
                currentVisibility={node.visibility ?? 'private'}
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {hasFile && fileUrl && node.source_file_type === 'pdf' ? (
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
            viewTypeOverride="document"
          />
        ) : hasFile && fileUrl ? (
          <FileViewer
            url={fileUrl}
            fileType={node.source_file_type ?? 'unknown'}
            nodeData={{
              slides: (node.domain_data as any)?.slides,
              docx_html: (node.domain_data as any)?.docx_html,
              sheets: (node.domain_data as any)?.sheets,
              extracted_text: (node.domain_data as any)?.extracted_text,
            }}
          />
        ) : (
          <NodeViewClient
            node={{
              ...node,
              domain_data: {
                ...(node.domain_data as any ?? {}),
              },
            }}
            triples={triples ?? []}
            sections={sections ?? []}
            sentences={sentences ?? []}
          />
        )}
      </div>
    </div>
  );
}
