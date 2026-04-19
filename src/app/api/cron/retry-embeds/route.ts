import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const CRON_SECRET = process.env.CRON_SECRET;
const MAX_RETRY_COUNT = 3;
const BATCH_SIZE = 50;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Retry Failed Embeddings Cron
 *
 * Finds sentences with embed_status='failed' and retries embedding.
 * Tracks retry count via embed_meta JSON field.
 * Sentences that exceed MAX_RETRY_COUNT are marked 'abandoned'.
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
    // Find failed sentences
    const { data: failedSentences } = await supabase
      .from('sentences')
      .select('id, text, node_id, embed_meta')
      .eq('embed_status', 'failed')
      .limit(BATCH_SIZE);

    if (!failedSentences?.length) {
      return NextResponse.json({ success: true, retried: 0, abandoned: 0, message: 'No failed sentences to retry' });
    }

    // Separate into retryable vs abandoned
    const retryable: typeof failedSentences = [];
    const toAbandon: typeof failedSentences = [];

    for (const s of failedSentences) {
      const meta = (s.embed_meta as Record<string, unknown>) ?? {};
      const retryCount = typeof meta.retry_count === 'number' ? meta.retry_count : 0;
      if (retryCount >= MAX_RETRY_COUNT) {
        toAbandon.push(s);
      } else {
        retryable.push(s);
      }
    }

    // Mark abandoned
    for (const s of toAbandon) {
      await supabase
        .from('sentences')
        .update({ embed_status: 'abandoned' })
        .eq('id', s.id);
    }

    if (retryable.length === 0) {
      return NextResponse.json({ success: true, retried: 0, abandoned: toAbandon.length });
    }

    // Attempt embedding
    const texts = retryable.map(s => s.text);

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      // Log cost
      await supabase.from('api_cost_log').insert({
        operation: 'embed_retry',
        model: 'text-embedding-3-small',
        tokens: response.usage.total_tokens,
        cost_usd: response.usage.total_tokens * 0.00000002,
      });

      // Update each sentence with embedding
      let successCount = 0;
      for (let i = 0; i < retryable.length; i++) {
        const { error } = await supabase
          .from('sentences')
          .update({
            embedding: response.data[i].embedding,
            embed_status: 'done',
            embed_meta: { retry_count: getRetryCount(retryable[i].embed_meta) + 1, recovered: true },
          })
          .eq('id', retryable[i].id);

        if (!error) successCount++;
      }

      return NextResponse.json({
        success: true,
        retried: successCount,
        abandoned: toAbandon.length,
        total_failed_found: failedSentences.length,
      });
    } catch (embErr) {
      // API still failing — increment retry counts
      console.error('[RetryEmbeds] OpenAI still unavailable:', embErr);

      for (const s of retryable) {
        const currentCount = getRetryCount(s.embed_meta);
        await supabase
          .from('sentences')
          .update({
            embed_meta: { retry_count: currentCount + 1, last_error: String(embErr) },
          })
          .eq('id', s.id);
      }

      return NextResponse.json({
        success: false,
        error: 'OpenAI embedding API still unavailable',
        retried: 0,
        abandoned: toAbandon.length,
        incremented: retryable.length,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RetryEmbeds] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getRetryCount(meta: unknown): number {
  if (meta && typeof meta === 'object' && 'retry_count' in meta) {
    const count = (meta as Record<string, unknown>).retry_count;
    return typeof count === 'number' ? count : 0;
  }
  return 0;
}
