import { createClient } from '@/lib/supabase/server';

export interface SearchLogRecord {
  userId?: string;
  searchContext: string;
  query: string;
  filters?: Record<string, unknown>;
  resultCount?: number;
  searchMode?: 'client' | 'server';
  page?: number;
}

/**
 * 검색 쿼리를 search_log에 기록한다.
 * 실패해도 메인 로직에 영향 없음 (fire-and-forget).
 */
export async function logSearch(record: SearchLogRecord): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('search_log').insert({
      user_id: record.userId ?? null,
      search_context: record.searchContext,
      query: record.query,
      filters: record.filters ?? null,
      result_count: record.resultCount ?? null,
      search_mode: record.searchMode ?? null,
      page: record.page ?? null,
    });
  } catch (e) {
    console.error('[SearchLog] insert failed:', e);
  }
}
