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
function generateTriplesForFormula(
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

  // (방제, is_a, 소분류) — 분류 관계
  if (domainData.category_minor) {
    const cat = domainData.category_minor.replace(/^\d+(?:-\d+)?\.\s*/, '');
    triples.push({ ...base, subject: name, predicate: 'is_a', object: cat });
  }

  // (방제, part_of, 대분류) — 상위 분류
  if (domainData.category_major) {
    const major = domainData.category_major.replace(/^\d+\.\s*/, '');
    triples.push({ ...base, subject: name, predicate: 'part_of', object: major });
  }

  // (방제, requires, 본초명) — 각 구성약물마다
  if (Array.isArray(domainData.composition)) {
    for (const comp of domainData.composition) {
      const herbName = comp.herb_hanja
        ? `${comp.herb_name}(${comp.herb_hanja})`
        : comp.herb_name;
      triples.push({ ...base, subject: name, predicate: 'requires', object: herbName });
      // 역방향: (본초, related_to, 방제)
      triples.push({ ...base, subject: herbName, predicate: 'related_to', object: name });
    }
  }

  // (방제, causes, 효능) — 각 효능마다
  if (Array.isArray(domainData.efficacy)) {
    for (const eff of domainData.efficacy) {
      triples.push({ ...base, subject: name, predicate: 'causes', object: eff });
    }
  }

  // (방제, involves, 주치) — 각 주치마다
  if (Array.isArray(domainData.indications)) {
    for (const ind of domainData.indications) {
      triples.push({ ...base, subject: name, predicate: 'involves', object: ind });
    }
  }

  // (방제, derived_from, 출전) — 출처
  if (domainData.source) {
    triples.push({ ...base, subject: name, predicate: 'derived_from', object: domainData.source });
  }

  return triples;
}

/**
 * 방제 노드에서 결정적 트리플 생성 및 DB 삽입
 * enrichment_status가 'enriched' 또는 'partial'인 노드 대상
 */
export async function generateBangjeTriples(supabaseAdmin: SupabaseClient) {
  // 1. 관리자 유저 조회
  const { data: adminUsers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1);

  const adminUserId = adminUsers?.[0]?.id;
  if (!adminUserId) throw new Error('Admin user not found');

  // 2. 방제 노드 조회
  const { data: nodes, error } = await supabaseAdmin
    .from('data_nodes')
    .select('id, domain_data')
    .eq('user_id', adminUserId)
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true);

  if (error) throw new Error(`Query failed: ${error.message}`);

  // formula_id가 있고 최소한 partial 이상인 노드
  const formulaNodes = (nodes ?? []).filter(
    (n: any) => n.domain_data?.formula_id &&
      (n.domain_data?.enrichment_status === 'enriched' || n.domain_data?.enrichment_status === 'partial'),
  );

  if (formulaNodes.length === 0) {
    return { generated: 0, total: 0 };
  }

  let totalGenerated = 0;

  for (const node of formulaNodes) {
    // 기존 generated 트리플 삭제 (재생성 가능)
    await supabaseAdmin
      .from('triples')
      .delete()
      .eq('node_id', node.id)
      .eq('source_type', 'generated');

    const triples = generateTriplesForFormula(node.id, node.domain_data);

    if (triples.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('triples')
        .insert(triples);

      if (insertError) {
        console.error(`[BangjeTriples] Insert failed for node ${node.id}:`, insertError.message);
        continue;
      }

      totalGenerated += triples.length;
    }
  }

  // 방제 간 파생 관계 트리플 생성
  const formulaRelTriples = generateFormulaRelationTriples(formulaNodes);
  if (formulaRelTriples.length > 0) {
    const { error: relError } = await supabaseAdmin
      .from('triples')
      .insert(formulaRelTriples);

    if (relError) {
      console.error(`[BangjeTriples] Formula relation insert failed:`, relError.message);
    } else {
      totalGenerated += formulaRelTriples.length;
    }
  }

  return {
    generated: totalGenerated,
    total: formulaNodes.length,
    formulaRelations: formulaRelTriples.length,
  };
}

/**
 * 방제 간 파생 관계를 이름 패턴으로 결정적 추출
 * - 가미X → derived_from X
 * - X가Y탕 → derived_from X탕
 * - 소X / 대X → related_to 쌍
 */
function generateFormulaRelationTriples(
  formulaNodes: { id: string; domain_data: Record<string, any> }[],
): TripleInsert[] {
  const triples: TripleInsert[] = [];
  const base = {
    source_level: 'node' as const,
    source_type: 'generated' as const,
    confidence: 'high' as const,
  };

  // 이름 → nodeId + displayName 맵
  const nameMap = new Map<string, { nodeId: string; display: string }>();
  for (const node of formulaNodes) {
    const d = node.domain_data;
    const korean = d.name_korean;
    const display = d.name_hanja ? `${korean}(${d.name_hanja})` : korean;
    if (korean) nameMap.set(korean, { nodeId: node.id, display });
  }

  for (const node of formulaNodes) {
    const d = node.domain_data;
    const name = d.name_korean as string;
    if (!name) continue;

    const display = d.name_hanja ? `${name}(${d.name_hanja})` : name;

    // 패턴 1: 가미X → derived_from X
    if (name.startsWith('가미')) {
      const parent = name.slice(2);
      const parentInfo = nameMap.get(parent);
      if (parentInfo) {
        triples.push({
          ...base,
          node_id: node.id,
          subject: display,
          predicate: 'derived_from',
          object: parentInfo.display,
        });
      }
    }

    // 패턴 2: X가Y탕/산/환 → derived_from X탕/산/환
    const gaMatch = name.match(/^(.+)가(.+)(탕|산|환|음)$/);
    if (gaMatch) {
      const parentName = gaMatch[1] + gaMatch[3];
      const parentInfo = nameMap.get(parentName);
      if (parentInfo) {
        triples.push({
          ...base,
          node_id: node.id,
          subject: display,
          predicate: 'derived_from',
          object: parentInfo.display,
        });
      }
    }

    // 패턴 3: 소X ↔ 대X → related_to
    if (name.startsWith('소')) {
      const counterpart = '대' + name.slice(1);
      const counterInfo = nameMap.get(counterpart);
      if (counterInfo) {
        triples.push({
          ...base,
          node_id: node.id,
          subject: display,
          predicate: 'related_to',
          object: counterInfo.display,
        });
      }
    }
  }

  return triples;
}
