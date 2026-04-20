import type { SupabaseClient } from '@supabase/supabase-js';
import { makeAdminInternalDomainData } from './admin-seed';
import shanghanlunRaw from '@/data/shanghanlun-raw.json';

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
  formula_names?: string[];
  key_concepts: string[];
  syndrome: string;
  generation_method?: string;
}

/**
 * 상한론 조문 DataNode raw 텍스트 생성
 */
function buildRawText(article: ShanghanlunArticle): string {
  const parts: string[] = [
    `[상한론 제${article.article_number}조] ${article.section}`,
    `원문: ${article.original_text}`,
    `해석: ${article.translation}`,
  ];
  if (article.syndrome) {
    parts.push(`증후: ${article.syndrome}`);
  }
  if (article.key_concepts.length > 0) {
    parts.push(`핵심 개념: ${article.key_concepts.join(', ')}`);
  }
  return parts.join('\n');
}

/**
 * 섹션별 텍스트 빌드 (섹션당 임베딩 분리)
 */
function buildSections(article: ShanghanlunArticle): Array<{ heading: string; text: string }> {
  const sections: Array<{ heading: string; text: string }> = [];

  // 섹션 1: 원문
  const originalLines = [article.original_text];
  if (article.korean_text) originalLines.push(`(${article.korean_text})`);
  sections.push({ heading: '원문', text: originalLines.join(' ') });

  // 섹션 2: 해석
  sections.push({ heading: '해석', text: article.translation });

  // 섹션 3: 증후/개념 (있는 경우만)
  const conceptParts: string[] = [];
  if (article.syndrome) conceptParts.push(`증후: ${article.syndrome}`);
  if (article.key_concepts.length > 0) {
    conceptParts.push(`핵심개념: ${article.key_concepts.join(', ')}`);
  }
  if (article.formula_names && article.formula_names.length > 0) {
    conceptParts.push(`관련처방: ${article.formula_names.join(', ')}`);
  }
  if (conceptParts.length > 0) {
    sections.push({ heading: '증후/개념', text: conceptParts.join('. ') });
  }

  return sections;
}

/**
 * bangje formula_id → DataNode UUID 룩업맵 구축
 */
async function buildFormulaNodeMap(
  supabaseAdmin: SupabaseClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data: formulaNodes } = await supabaseAdmin
      .from('data_nodes')
      .select('id, domain_data')
      .eq('is_admin_node', true)
      .not('domain_data->>formula_id', 'is', null)
      .range(from, from + PAGE - 1);

    if (!formulaNodes || formulaNodes.length === 0) break;

    for (const node of formulaNodes) {
      const d = (node as any).domain_data;
      if (d?.formula_id) map.set(d.formula_id, node.id);
    }

    if (formulaNodes.length < PAGE) break;
    from += PAGE;
  }

  return map;
}

/**
 * 한자 char → DataNode UUID 룩업맵 구축
 * original_text에서 추출될 한자들을 배치로 룩업
 */
async function buildHanjaNodeMap(
  supabaseAdmin: SupabaseClient,
  chars: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (chars.length === 0) return map;

  // 1000자씩 배치 조회
  const BATCH = 1000;
  for (let i = 0; i < chars.length; i += BATCH) {
    const batch = chars.slice(i, i + BATCH);
    const { data } = await supabaseAdmin
      .from('data_nodes')
      .select('id, domain_data')
      .eq('is_admin_node', true)
      .in('domain_data->>char', batch);

    for (const node of data ?? []) {
      const ch = (node as any).domain_data?.char;
      if (ch) map.set(ch, node.id);
    }
  }
  return map;
}

/**
 * 한문 텍스트에서 고유 한자만 추출
 */
function extractHanjaChars(text: string): string[] {
  const chars = new Set<string>();
  for (const ch of text) {
    if (ch >= '\u4E00' && ch <= '\u9FFF') chars.add(ch);  // CJK 기본
    if (ch >= '\u3400' && ch <= '\u4DBF') chars.add(ch);  // CJK 확장 A
  }
  return Array.from(chars);
}

/**
 * 상한론 조문 DataNode 시드
 */
export async function seedShanghanlunData(
  supabaseAdmin: SupabaseClient,
): Promise<{ created: number; skipped: number; adminUserId: string; nodes: { id: string; raw: string }[] }> {
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

  const articles = shanghanlunRaw as ShanghanlunArticle[];

  // 2. 기존 중복 체크 (article_id 기준)
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
    console.log('[ShanghanlunSeed] 모든 조문 이미 존재. 건너뜀.');
    return { created: 0, skipped: articles.length, adminUserId, nodes: [] };
  }

  console.log(`[ShanghanlunSeed] 삽입: ${newArticles.length}개, 스킵: ${existingIds.size}개`);

  // 3. bangje formula_id → DataNode UUID 맵 구축
  const formulaNodeMap = await buildFormulaNodeMap(supabaseAdmin);

  // 3b. 한자 → DataNode UUID 맵 구축 (전체 원문에서 한자 추출 후 배치 룩업)
  const allHanjaChars = Array.from(
    new Set(newArticles.flatMap(a => extractHanjaChars(a.original_text)))
  );
  console.log(`[ShanghanlunSeed] 고유 한자 ${allHanjaChars.length}자 룩업 중...`);
  const hanjaNodeMap = await buildHanjaNodeMap(supabaseAdmin, allHanjaChars);
  console.log(`[ShanghanlunSeed] 한자 매핑 ${hanjaNodeMap.size}자`);

  // 4. DataNode 일괄 삽입 (배치 50개씩)
  const BATCH_SIZE = 50;
  const allInserted: { id: string; raw: string; article: ShanghanlunArticle }[] = [];

  for (let i = 0; i < newArticles.length; i += BATCH_SIZE) {
    const batch = newArticles.slice(i, i + BATCH_SIZE);

    const insertPayload = batch.map(article => ({
      user_id: adminUserId,
      domain: 'knowledge',
      raw: buildRawText(article),
      domain_data: makeAdminInternalDomainData({
        type: 'shanghanlun',
        article_id: article.id,
        article_number: article.article_number,
        original_text: article.original_text,
        korean_text: article.korean_text,
        translation: article.translation,
        chapter: article.chapter,
        section: article.section,
        related_formulas: article.related_formulas,
        formula_names: article.formula_names ?? [],
        key_concepts: article.key_concepts,
        syndrome: article.syndrome,
        generation_method: article.generation_method ?? 'manual',
      }),
      visibility: 'public' as const,
      confidence: 'high' as const,
      source_type: 'manual',
      resolution: 'resolved',
      view_hint: 'knowledge_graph',
      is_admin_node: true,
    }));

    const { data: inserted, error } = await supabaseAdmin
      .from('data_nodes')
      .insert(insertPayload)
      .select('id, raw');

    if (error) {
      throw new Error(`[ShanghanlunSeed] 배치 ${Math.floor(i / BATCH_SIZE) + 1} 실패: ${error.message}`);
    }

    const insertedWithArticle = (inserted ?? []).map((node, idx) => ({
      ...node,
      article: batch[idx],
    }));
    allInserted.push(...insertedWithArticle);
  }

  // 5. 각 노드에 sections + sentences 생성
  for (const { id: nodeId, article } of allInserted) {
    const sectionDefs = buildSections(article);

    for (let sIdx = 0; sIdx < sectionDefs.length; sIdx++) {
      const { heading, text } = sectionDefs[sIdx];

      const { data: section } = await supabaseAdmin
        .from('sections')
        .insert({ node_id: nodeId, heading, order_idx: sIdx })
        .select('id')
        .single();

      if (!section) continue;

      // 문장 분리 (문장 종결 기준)
      const rawSentences = text
        .split(/(?<=[.다])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const sentences = rawSentences.length > 0 ? rawSentences : [text];

      for (let j = 0; j < sentences.length; j++) {
        await supabaseAdmin.from('sentences').insert({
          section_id: section.id,
          node_id: nodeId,
          text: sentences[j],
          order_idx: j,
          embed_status: 'pending',
          embed_tier: 'hot',
        });
      }
    }
  }

  console.log(`[ShanghanlunSeed] sections/sentences 생성 완료`);

  // 6. node_relations 생성 (조문 → 방제 엣지)
  let relationCount = 0;
  for (const { id: nodeId, article } of allInserted) {
    for (const formulaId of article.related_formulas) {
      const targetNodeId = formulaNodeMap.get(formulaId);
      if (!targetNodeId) continue;

      await supabaseAdmin.from('node_relations').insert({
        source_node_id: nodeId,
        target_node_id: targetNodeId,
        relation_type: 'involves',
        weight: 1.5,
        source: 'sql',
      }).then(({ error }) => {
        if (!error) relationCount++;
      });
    }
  }

  console.log(`[ShanghanlunSeed] node_relations(방제) ${relationCount}개 생성`);

  // 6b. node_relations 생성 (조문 → 한자 엣지)
  let hanjaRelationCount = 0;
  for (const { id: nodeId, article } of allInserted) {
    const chars = extractHanjaChars(article.original_text);
    const hanjaRelations = chars
      .map(ch => hanjaNodeMap.get(ch))
      .filter((id): id is string => !!id)
      .map(targetNodeId => ({
        source_node_id: nodeId,
        target_node_id: targetNodeId,
        relation_type: 'involves',
        weight: 1.0,
        source: 'sql',
      }));

    if (hanjaRelations.length > 0) {
      const { error } = await supabaseAdmin
        .from('node_relations')
        .insert(hanjaRelations);
      if (!error) hanjaRelationCount += hanjaRelations.length;
    }
  }
  console.log(`[ShanghanlunSeed] node_relations(한자) ${hanjaRelationCount}개 생성`);

  // 7. Layer 3 비동기 트리거 (임베딩 + 트리플)
  import('../pipeline/layer3').then(({ embedPendingSentences, extractTriples }) => {
    for (const { id: nodeId, article } of allInserted) {
      embedPendingSentences(nodeId).catch(e =>
        console.error(`[ShanghanlunSeed] embed 실패 (조문 ${article.article_number}):`, e),
      );
      extractTriples(nodeId).catch(e =>
        console.error(`[ShanghanlunSeed] triple 실패 (조문 ${article.article_number}):`, e),
      );
    }
  }).catch(() => {});

  const nodes = allInserted.map(({ id, raw }) => ({ id, raw }));
  console.log(`[ShanghanlunSeed] 완료. 생성: ${nodes.length}개, 스킵: ${existingIds.size}개`);

  return { created: nodes.length, skipped: existingIds.size, adminUserId, nodes };
}
