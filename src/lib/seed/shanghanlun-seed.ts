import type { SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

interface ShanghanlunArticle {
  id: string;
  article_number: number;
  original_text: string;
  korean_text: string;
  translation: string;
  chapter: string;
  section: string;
  related_formulas: string[];
  key_concepts: string[];
  syndrome: string;
}

function loadShanghanlunData(): ShanghanlunArticle[] {
  const filePath = join(process.cwd(), 'src/data/shanghanlun-raw.json');
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * 상한론 조문 DataNode 시드
 */
export async function seedShanghanlunData(
  supabaseAdmin: SupabaseClient,
): Promise<{ created: number; skipped: number; adminUserId: string }> {
  // 1. 관리자 유저 조회
  const { data: adminUsers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1);

  let adminUserId: string | null = adminUsers?.[0]?.id ?? null;

  if (!adminUserId) {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const adminAuth = authData?.users?.find(u => u.email === ADMIN_EMAIL);
    adminUserId = adminAuth?.id ?? null;
  }

  if (!adminUserId) {
    throw new Error(`Admin user not found for email: ${ADMIN_EMAIL}`);
  }

  // 2. 데이터 로드
  console.log('[ShanghanlunSeed] Loading shanghanlun-raw.json...');
  const articles = loadShanghanlunData();
  console.log(`[ShanghanlunSeed] Loaded: ${articles.length} articles`);

  // 3. 기존 중복 체크 (article_id 기준)
  const { data: existingNodes } = await supabaseAdmin
    .from('data_nodes')
    .select('domain_data')
    .eq('is_admin_node', true)
    .eq('domain', 'knowledge')
    .filter('domain_data->>type', 'eq', 'shanghanlun');

  const existingIds = new Set(
    (existingNodes ?? [])
      .map((n: any) => n.domain_data?.article_id)
      .filter(Boolean),
  );

  const newArticles = articles.filter(a => !existingIds.has(a.id));

  if (newArticles.length === 0) {
    return { created: 0, skipped: articles.length, adminUserId };
  }

  console.log(`[ShanghanlunSeed] To insert: ${newArticles.length}, to skip: ${existingIds.size}`);

  // 4. DataNode 삽입 (배치 50개씩)
  const BATCH_SIZE = 50;
  let created = 0;

  for (let i = 0; i < newArticles.length; i += BATCH_SIZE) {
    const batch = newArticles.slice(i, i + BATCH_SIZE);

    const insertPayload = batch.map(article => ({
      user_id: adminUserId,
      domain: 'knowledge',
      raw: buildRawText(article),
      domain_data: {
        type: 'shanghanlun',
        article_id: article.id,
        article_number: article.article_number,
        original_text: article.original_text,
        korean_text: article.korean_text,
        translation: article.translation,
        chapter: article.chapter,
        section: article.section,
        related_formulas: article.related_formulas,
        key_concepts: article.key_concepts,
        syndrome: article.syndrome,
      },
      visibility: 'public' as const,
      confidence: 'high' as const,
      source_type: 'manual',
      resolution: 'resolved',
      view_hint: 'knowledge_graph',
      is_admin_node: true,
    }));

    const { error } = await supabaseAdmin
      .from('data_nodes')
      .insert(insertPayload);

    if (error) {
      throw new Error(`[ShanghanlunSeed] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
    }

    created += batch.length;
  }

  console.log(`[ShanghanlunSeed] Done. Created: ${created}, Skipped: ${existingIds.size}`);

  return { created, skipped: existingIds.size, adminUserId };
}

function buildRawText(article: ShanghanlunArticle): string {
  const parts: string[] = [];

  parts.push(`[상한론 제${article.article_number}조] ${article.chapter} ${article.section}`);
  parts.push(`원문: ${article.original_text}`);
  parts.push(`해석: ${article.translation}`);

  if (article.syndrome) {
    parts.push(`증후: ${article.syndrome}`);
  }

  if (article.key_concepts.length > 0) {
    parts.push(`핵심 개념: ${article.key_concepts.join(', ')}`);
  }

  return parts.join('\n');
}
