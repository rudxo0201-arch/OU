import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { query?: string; mode?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { query, mode = 'hybrid' } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    if (!['keyword', 'semantic', 'hybrid'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const results: Array<{
      id: string;
      domain: string;
      domain_data?: Record<string, unknown>;
      raw: string;
      created_at: string;
      confidence?: string;
      similarity?: number;
    }> = [];

    if (mode === 'keyword' || mode === 'hybrid') {
      const orFilter = [
        `raw.ilike.%${query}%`,
        `domain_data->>title.ilike.%${query}%`,
        `domain_data->>what.ilike.%${query}%`,
        `domain_data->>instructor.ilike.%${query}%`,
        `domain_data->>category.ilike.%${query}%`,
        `domain_data->>name.ilike.%${query}%`,
        `domain_data->>location.ilike.%${query}%`,
      ].join(',');

      const { data: sqlResults } = await supabase
        .from('data_nodes')
        .select('id, domain, domain_data, raw, created_at, confidence')
        .eq('user_id', user.id)
        .not('domain_data->>_admin_internal', 'eq', 'true')
        .not('system_tags', 'cs', '{"archived"}')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(20);

      (sqlResults ?? []).forEach((r: { id: string; domain: string; domain_data?: Record<string, unknown>; raw: string; created_at: string; confidence?: string }) => {
        results.push({
          id: r.id,
          domain: r.domain,
          domain_data: r.domain_data,
          raw: r.raw,
          created_at: r.created_at,
          confidence: r.confidence ?? undefined,
        });
      });
    }

    if (mode === 'semantic' || mode === 'hybrid') {
      try {
        const embRes = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query,
        });
        const queryEmbedding = embRes.data[0].embedding;

        const { data: vectorResults } = await supabase.rpc('match_sentences', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: 20,
          p_user_id: user.id,
        });

        const existingIds = new Set(results.map(r => r.id));
        const vectorIds = (vectorResults ?? [])
          .filter((r: { node_id: string; similarity?: number }) => !existingIds.has(r.node_id))
          .map((r: { node_id: string; similarity?: number }) => ({ id: r.node_id, similarity: r.similarity ?? 0 }));

        if (vectorIds.length > 0) {
          const { data: vectorNodes } = await supabase
            .from('data_nodes')
            .select('id, domain, domain_data, raw, created_at, confidence')
            .in('id', vectorIds.map((v: { id: string; similarity: number }) => v.id))
            .eq('user_id', user.id)
            .not('domain_data->>_admin_internal', 'eq', 'true');

          const simMap = new Map(vectorIds.map((v: { id: string; similarity: number }) => [v.id, v.similarity]));
          (vectorNodes ?? []).forEach((node: { id: string; domain: string; domain_data?: Record<string, unknown>; raw: string; created_at: string; confidence?: string }) => {
            results.push({
              id: node.id,
              domain: node.domain,
              domain_data: node.domain_data,
              raw: node.raw,
              created_at: node.created_at,
              confidence: node.confidence ?? undefined,
              similarity: simMap.get(node.id) as number | undefined,
            });
          });
        }
      } catch (embErr) {
        // Semantic search unavailable, using keyword fallback
        console.warn('[Search] Semantic search unavailable, using keyword fallback:', embErr);

        // For semantic-only mode, fall back to keyword search so user still gets results
        if (mode === 'semantic' && results.length === 0) {
          const fallbackOrFilter = [
            `raw.ilike.%${query}%`,
            `domain_data->>title.ilike.%${query}%`,
            `domain_data->>what.ilike.%${query}%`,
            `domain_data->>instructor.ilike.%${query}%`,
            `domain_data->>category.ilike.%${query}%`,
            `domain_data->>name.ilike.%${query}%`,
            `domain_data->>location.ilike.%${query}%`,
          ].join(',');
          const { data: fallbackResults } = await supabase
            .from('data_nodes')
            .select('id, domain, domain_data, raw, created_at, confidence')
            .eq('user_id', user.id)
            .not('domain_data->>_admin_internal', 'eq', 'true')
            .not('system_tags', 'cs', '{"archived"}')
            .or(fallbackOrFilter)
            .order('created_at', { ascending: false })
            .limit(20);

          (fallbackResults ?? []).forEach((r: { id: string; domain: string; domain_data?: Record<string, unknown>; raw: string; created_at: string; confidence?: string }) => {
            results.push({
              id: r.id,
              domain: r.domain,
              domain_data: r.domain_data,
              raw: r.raw,
              created_at: r.created_at,
              confidence: r.confidence ?? undefined,
            });
          });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error('[Search] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
