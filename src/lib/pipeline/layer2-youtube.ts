/**
 * Layer 2 — YouTube DataNode 생성
 *
 * parseYouTubeVideo() 결과를 받아 data_nodes/sections/sentences 저장
 * 기존 layer2.ts의 saveMessageAsync() 패턴 기반
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { classifyDomain } from './classifier';
import type { ParsedYouTube } from './parsers/youtube-parser';

interface SaveYouTubeNodeInput {
  userId: string;
  parsed: ParsedYouTube;
}

interface SaveYouTubeNodeResult {
  nodeId: string;
  domain: string;
  viewHint: string | null;
}

export async function saveYouTubeNode(input: SaveYouTubeNodeInput): Promise<SaveYouTubeNodeResult | null> {
  const supabase = createAdminClient();
  const { parsed } = input;
  const { metadata, transcriptCorrected, transcriptRaw } = parsed;

  // 중복 체크: 같은 user + 같은 video_id
  const { data: existing } = await supabase
    .from('data_nodes')
    .select('id, domain, view_hint')
    .eq('user_id', input.userId)
    .eq('source_type', 'youtube')
    .filter('domain_data->>video_id', 'eq', metadata.videoId)
    .limit(1)
    .single();

  if (existing) {
    return {
      nodeId: existing.id,
      domain: existing.domain,
      viewHint: existing.view_hint,
    };
  }

  // 도메인 분류 (transcript 기반)
  const textForClassify = transcriptCorrected || transcriptRaw || metadata.title;
  const { domain, viewHint: domainViewHint } = await classifyDomain(textForClassify);

  // YouTube는 항상 transcript 뷰 힌트
  const viewHint = 'transcript';

  // DataNode 생성
  const domainData: Record<string, unknown> = {
    video_id: metadata.videoId,
    title: metadata.title,
    channel_name: metadata.channelName,
    duration: metadata.duration,
    thumbnail_url: metadata.thumbnailUrl,
    chapters: metadata.chapters,
    transcript_language: parsed.language,
    transcript_raw: transcriptRaw,
    corrected: !!transcriptCorrected,
    ...(parsed.commentDigest.length > 0 ? { comment_digest: parsed.commentDigest } : {}),
    ...(metadata.publishedAt ? { published_at: metadata.publishedAt } : {}),
    ...(metadata.viewCount ? { view_count: metadata.viewCount } : {}),
  };

  const hasTranscript = parsed.transcript.length > 0;

  const { data: node, error: nodeErr } = await supabase.from('data_nodes').insert({
    user_id: input.userId,
    domain,
    raw: metadata.title,
    source_type: 'youtube',
    source_file_type: 'youtube',
    source_file_url: `https://youtube.com/watch?v=${metadata.videoId}`,
    confidence: hasTranscript ? 'high' : 'low',
    resolution: hasTranscript ? 'resolved' : 'opaque',
    view_hint: viewHint,
    visibility: 'private',
    domain_data: domainData,
  }).select().single();

  if (nodeErr || !node) {
    console.error('[Layer2-YouTube] data_node insert failed:', nodeErr?.message);
    return null;
  }

  // Sections + Sentences 생성
  if (parsed.sections.length > 0) {
    for (let i = 0; i < parsed.sections.length; i++) {
      const section = parsed.sections[i];

      const { data: sec } = await supabase.from('sections').insert({
        node_id: node.id,
        heading: section.heading,
        order_idx: i,
      }).select().single();

      if (sec && section.sentences.length > 0) {
        const sentenceRows = section.sentences.map((s, j) => ({
          section_id: sec.id,
          node_id: node.id,
          text: s.text,
          order_idx: j,
          embed_status: 'pending' as const,
          embed_tier: 'hot' as const,
          source_location: { start_time: s.startTime, end_time: s.endTime },
        }));

        await supabase.from('sentences').insert(sentenceRows);
      }
    }
  }

  // Layer 3: 임베딩 + 트리플 (비동기, 실패 무시)
  if (hasTranscript) {
    import('./layer3').then(({ embedPendingSentences, extractTriples }) => {
      embedPendingSentences(node.id).catch(e => console.error('[Layer3-YouTube] embed failed:', e));
      extractTriples(node.id).catch(e => console.error('[Layer3-YouTube] triple failed:', e));
    }).catch(() => {});
  }

  return { nodeId: node.id, domain, viewHint };
}
