/**
 * ingest-conversation.ts
 *
 * 대화 수집 공통 로직 — ingest API + MCP tools가 공유.
 * 메시지 → 도메인 분류 → DataNode → sections → sentences → Layer 3 (async)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { classifyDomain } from './classifier';
import { extractDomainData } from './extract-domain-data';

export interface IngestMessage {
  role: string;
  content: string;
}

export interface IngestMetadata {
  source?: string;           // "claude_code", "claude_ai", "chatgpt", etc.
  session_id?: string;
  working_directory?: string;
  files_changed?: string[];
  git_diff_summary?: string;
  commit_hash?: string;
  branch?: string;
}

export interface IngestParams {
  userId: string;
  messages: IngestMessage[];
  metadata?: IngestMetadata;
  sourceType: 'dev_tool' | 'mcp';
  messageType: 'dev_session' | 'mcp_session';
  supabase: SupabaseClient;
}

export interface IngestResult {
  nodeId: string;
  domain: string;
  viewHint: string | null;
}

export async function ingestConversation({
  userId,
  messages,
  metadata,
  sourceType,
  messageType,
  supabase,
}: IngestParams): Promise<IngestResult> {
  // 대화 전체 텍스트
  const fullText = messages
    .map(m => `[${m.role}] ${m.content}`)
    .join('\n\n');

  const userMessages = messages
    .filter(m => m.role === 'user' || m.role === 'human')
    .map(m => m.content)
    .join('\n');

  const assistantMessages = messages
    .filter(m => m.role === 'assistant')
    .map(m => m.content)
    .join('\n');

  // 도메인 분류 (비용 0)
  const { domain, viewHint, confidence } = await classifyDomain(fullText);

  // domain_data 추출 (비용 0)
  const domainData = {
    ...extractDomainData(userMessages || fullText, domain),
    ...(metadata?.source ? { source_tool: metadata.source } : {}),
    ...(metadata?.working_directory ? { working_directory: metadata.working_directory } : {}),
    ...(metadata?.files_changed ? { files_changed: metadata.files_changed } : {}),
    ...(metadata?.git_diff_summary ? { git_diff_summary: metadata.git_diff_summary } : {}),
    ...(metadata?.session_id ? { session_id: metadata.session_id } : {}),
    ...(metadata?.commit_hash ? { commit_hash: metadata.commit_hash } : {}),
    ...(metadata?.branch ? { branch: metadata.branch } : {}),
  };

  // messages 테이블 삽입
  const { data: userMsg } = await supabase.from('messages').insert({
    user_id: userId,
    role: 'user',
    raw: userMessages || fullText,
    type: messageType,
  }).select().single();

  const { data: assistantMsg } = await supabase.from('messages').insert({
    user_id: userId,
    role: 'assistant',
    raw: assistantMessages,
    type: messageType,
    pair_id: userMsg?.id ?? null,
  }).select().single();

  // data_node 생성
  const { data: node, error: nodeErr } = await supabase.from('data_nodes').insert({
    user_id: userId,
    message_id: assistantMsg?.id ?? userMsg?.id,
    domain,
    raw: fullText,
    source_type: sourceType,
    confidence,
    resolution: 'resolved',
    view_hint: viewHint,
    visibility: 'private',
    domain_data: domainData,
  }).select().single();

  if (nodeErr || !node) {
    throw new Error(`DataNode creation failed: ${nodeErr?.message ?? 'unknown'}`);
  }

  // sections + sentences 생성
  const sections = messages.reduce((acc, m, i) => {
    if (m.role === 'user' || m.role === 'human') {
      acc.push({ heading: `Turn ${Math.floor(i / 2) + 1}`, content: m.content });
    }
    return acc;
  }, [] as Array<{ heading: string; content: string }>);

  for (let i = 0; i < sections.length; i++) {
    const { data: sec } = await supabase.from('sections').insert({
      node_id: node.id,
      heading: sections[i].heading,
      order_idx: i,
    }).select().single();

    if (sec) {
      const rawSentences = sections[i].content
        .split(/(?<=[.!?])\s+|。|\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const sentences = rawSentences.length > 0 ? rawSentences : [sections[i].content.trim()];

      for (let j = 0; j < sentences.length; j++) {
        await supabase.from('sentences').insert({
          section_id: sec.id,
          node_id: node.id,
          text: sentences[j],
          order_idx: j,
          embed_status: 'pending',
          embed_tier: 'hot',
        });
      }
    }
  }

  // Layer 3 비동기 (embeddings + triples) — 전부 실행, 비용 아끼지 않음
  import('@/lib/pipeline/layer3').then(({ embedPendingSentences, extractTriples }) => {
    embedPendingSentences(node.id).catch(e => console.error('[Ingest] embed failed:', e));
    extractTriples(node.id).catch(e => console.error('[Ingest] triple failed:', e));
  }).catch(e => console.error('[Ingest] Layer3 import failed:', e));

  return {
    nodeId: node.id,
    domain,
    viewHint,
  };
}
