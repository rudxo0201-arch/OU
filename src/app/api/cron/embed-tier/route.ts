import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const CRON_SECRET = process.env.CRON_SECRET;
const WARM_BATCH_SIZE = 100;
const COLD_THRESHOLD_DAYS = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Embedding Tier Cron
 *
 * 1. Process warm queue: embed_tier='warm' + embed_status='pending' 문장을 배치 임베딩
 * 2. Demote cold: 30일 넘은 노드의 'done' 문장을 cold로 강등 (벡터 제거)
 * 3. Promote hot: 최근 접근된 cold/warm 노드를 hot으로 승격
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const supabase = await createClient();

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const results = {
      warm_embedded: 0,
      warm_failed: 0,
      demoted_to_cold: 0,
      promoted_to_hot: 0,
    };

    // ── 1. Process warm queue ──────────────────────────────
    // Find sentences with embed_tier='warm' and embed_status='pending'
    const { data: warmSentences } = await supabase
      .from('sentences')
      .select('id, text, node_id')
      .eq('embed_tier', 'warm')
      .eq('embed_status', 'pending')
      .limit(WARM_BATCH_SIZE);

    if (warmSentences?.length) {
      const texts = warmSentences.map((s: { text: string }) => s.text);

      try {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: texts,
        });

        // Log cost
        await supabase.from('api_cost_log').insert({
          operation: 'embed_warm_batch',
          model: 'text-embedding-3-small',
          tokens: response.usage.total_tokens,
          cost_usd: response.usage.total_tokens * 0.00000002,
        });

        for (let i = 0; i < warmSentences.length; i++) {
          const { error } = await supabase
            .from('sentences')
            .update({
              embedding: response.data[i].embedding,
              embed_status: 'done',
            })
            .eq('id', warmSentences[i].id);

          if (!error) results.warm_embedded++;
          else results.warm_failed++;
        }
      } catch (err) {
        console.error('[EmbedTier] Warm batch embedding failed:', err);
        results.warm_failed = warmSentences.length;
      }
    }

    // ── 2. Demote cold ─────────────────────────────────────
    // Find sentences where parent node is > 30 days old, embed_status='done',
    // and embed_tier is NOT already 'cold'
    const coldCutoff = new Date(Date.now() - COLD_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Get old nodes that still have embedded sentences
    const { data: oldNodes } = await supabase
      .from('data_nodes')
      .select('id')
      .lt('created_at', coldCutoff)
      .limit(500);

    if (oldNodes?.length) {
      const oldNodeIds = oldNodes.map((n: { id: string }) => n.id);

      // Demote in batches
      for (const nodeId of oldNodeIds) {
        const { data: embeddedSentences } = await supabase
          .from('sentences')
          .select('id')
          .eq('node_id', nodeId)
          .eq('embed_status', 'done')
          .neq('embed_tier', 'cold')
          .limit(200);

        if (embeddedSentences?.length) {
          for (const s of embeddedSentences) {
            await supabase
              .from('sentences')
              .update({
                embed_tier: 'cold',
                embedding: null,
              })
              .eq('id', s.id);
            results.demoted_to_cold++;
          }
        }
      }
    }

    // ── 3. Promote hot ─────────────────────────────────────
    // If a cold/warm node was recently accessed (last_accessed_at within 24h),
    // promote its sentences back to hot + re-queue for embedding
    const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentlyAccessed } = await supabase
      .from('data_nodes')
      .select('id')
      .gte('last_accessed_at', recentCutoff)
      .limit(100);

    if (recentlyAccessed?.length) {
      for (const node of recentlyAccessed) {
        // Find cold/warm sentences that need promotion
        const { data: coldWarmSentences } = await supabase
          .from('sentences')
          .select('id')
          .eq('node_id', node.id)
          .in('embed_tier', ['cold', 'warm'])
          .limit(200);

        if (coldWarmSentences?.length) {
          for (const s of coldWarmSentences) {
            await supabase
              .from('sentences')
              .update({
                embed_tier: 'hot',
                embed_status: 'pending',
              })
              .eq('id', s.id);
            results.promoted_to_hot++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EmbedTier] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET — Tier status counts
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const supabase = await createClient();

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    // Count by embed_tier
    const tiers = ['hot', 'warm', 'cold'] as const;
    const statuses = ['pending', 'processing', 'done', 'failed'] as const;

    const counts: Record<string, number> = {};

    for (const tier of tiers) {
      const { count } = await supabase
        .from('sentences')
        .select('id', { count: 'exact', head: true })
        .eq('embed_tier', tier);
      counts[`tier_${tier}`] = count ?? 0;
    }

    for (const status of statuses) {
      const { count } = await supabase
        .from('sentences')
        .select('id', { count: 'exact', head: true })
        .eq('embed_status', status);
      counts[`status_${status}`] = count ?? 0;
    }

    // Warm pending (actionable queue size)
    const { count: warmPending } = await supabase
      .from('sentences')
      .select('id', { count: 'exact', head: true })
      .eq('embed_tier', 'warm')
      .eq('embed_status', 'pending');
    counts.warm_pending = warmPending ?? 0;

    return NextResponse.json({ success: true, counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
