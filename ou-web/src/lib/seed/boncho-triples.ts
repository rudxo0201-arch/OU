import type { SupabaseClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

interface TripleInsert {
  node_id: string;
  subject: string;
  predicate: string;
  object: string;
  source_level: 'node';
  source_type: 'generated';
  confidence: 'high';
}

/**
 * domain_data에서 결정적으로 트리플을 생성
 * LLM 없이 구조화된 필드 → 11개 불변 서술어 매핑
 */
function generateTriplesForHerb(
  nodeId: string,
  domainData: Record<string, any>,
): TripleInsert[] {
  const triples: TripleInsert[] = [];
  const name = domainData.name_hanja
    ? `${domainData.name_korean}(${domainData.name_hanja})`
    : domainData.name_korean;

  if (!name) return triples;

  const base = {
    node_id: nodeId,
    source_level: 'node' as const,
    source_type: 'generated' as const,
    confidence: 'high' as const,
  };

  // (본초, is_a, 소분류) — 분류 관계
  if (domainData.category_minor) {
    const cat = domainData.category_minor.replace(/^\d+-\d+\.\s*/, '');
    triples.push({ ...base, subject: name, predicate: 'is_a', object: cat });
  }

  // (본초, part_of, 대분류) — 상위 분류
  if (domainData.category_major) {
    const major = domainData.category_major.replace(/^\d+\.\s*/, '');
    triples.push({ ...base, subject: name, predicate: 'part_of', object: major });
  }

  // (본초, located_at, 귀경) — 각 귀경마다
  if (Array.isArray(domainData.channel_tropism)) {
    for (const ch of domainData.channel_tropism) {
      triples.push({ ...base, subject: name, predicate: 'located_at', object: ch });
    }
  }

  // (본초, causes, 효능) — 각 효능마다
  if (Array.isArray(domainData.efficacy)) {
    for (const eff of domainData.efficacy) {
      triples.push({ ...base, subject: name, predicate: 'causes', object: eff });
    }
  }

  // (본초, involves, 주치) — 각 주치마다
  if (Array.isArray(domainData.indications)) {
    for (const ind of domainData.indications) {
      triples.push({ ...base, subject: name, predicate: 'involves', object: ind });
    }
  }

  // (성, related_to, 본초) — 성질 연결
  if (Array.isArray(domainData.nature)) {
    for (const nat of domainData.nature) {
      triples.push({ ...base, subject: nat, predicate: 'related_to', object: name });
    }
  }

  // (미, related_to, 본초) — 맛 연결
  if (Array.isArray(domainData.flavor)) {
    for (const flav of domainData.flavor) {
      triples.push({ ...base, subject: flav, predicate: 'related_to', object: name });
    }
  }

  return triples;
}

/**
 * 보강된 본초 노드에서 결정적 트리플 생성 및 DB 삽입
 * enrichment_status가 'enriched'인 노드 대상
 */
export async function generateBonchoTriples(supabaseAdmin: SupabaseClient) {
  // 1. 관리자 유저 조회
  const { data: adminUsers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1);

  const adminUserId = adminUsers?.[0]?.id;
  if (!adminUserId) throw new Error('Admin user not found');

  // 2. 보강된 본초 노드 조회
  const { data: nodes, error } = await supabaseAdmin
    .from('data_nodes')
    .select('id, domain_data')
    .eq('user_id', adminUserId)
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true);

  if (error) throw new Error(`Query failed: ${error.message}`);

  const enrichedNodes = (nodes ?? []).filter(
    (n: any) => n.domain_data?.herb_id && n.domain_data?.enrichment_status === 'enriched',
  );

  if (enrichedNodes.length === 0) {
    return { generated: 0, total: 0 };
  }

  let totalGenerated = 0;

  for (const node of enrichedNodes) {
    // 기존 generated 트리플 삭제 (재생성 가능)
    await supabaseAdmin
      .from('triples')
      .delete()
      .eq('node_id', node.id)
      .eq('source_type', 'generated');

    const triples = generateTriplesForHerb(node.id, node.domain_data);

    if (triples.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('triples')
        .insert(triples);

      if (insertError) {
        console.error(`[BonchoTriples] Insert failed for node ${node.id}:`, insertError.message);
        continue;
      }

      totalGenerated += triples.length;
    }
  }

  return {
    generated: totalGenerated,
    total: enrichedNodes.length,
  };
}
