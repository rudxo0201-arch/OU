import type { SupabaseClient } from '@supabase/supabase-js';
import { makeAdminInternalDomainData } from './admin-seed';
import bangjeRaw from '@/data/bangje-raw.json';

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

interface CompositionItem {
  herb_name: string;
  herb_hanja: string | null;
  herb_id: string | null;
  dosage: string | null;
  role: string | null;
}

interface BangjeRawItem {
  id: string;
  name: string;
  hanja: string | null;
  starred: boolean;
  categoryMajor: string | null;
  categoryMinor: string | null;
  categoryBangyak: string | null;
  tags: string[];
  composition: CompositionItem[];
  efficacy: string[] | null;
  indications: string[] | null;
  source: string | null;
  contraindications: string[] | null;
  modifications: string[] | null;
  lesson: string | null;
}

/**
 * 방제 raw 데이터를 DataNode raw 텍스트로 변환
 */
function buildRawText(formula: BangjeRawItem): string {
  const displayName = formula.hanja
    ? `${formula.name}(${formula.hanja})`
    : formula.name;

  const parts: string[] = [
    `${displayName}은(는) ${formula.categoryMinor ?? '미분류'} 소속 방제이다.`,
  ];

  // 구성 약물
  if (formula.composition.length > 0) {
    const compParts = formula.composition.map(c => {
      const herbDisplay = c.herb_hanja ? `${c.herb_name}(${c.herb_hanja})` : c.herb_name;
      const dosage = c.dosage ? ` ${c.dosage}` : '';
      const role = c.role ? `(${c.role})` : '';
      return `${herbDisplay}${dosage}${role}`;
    });
    parts.push(`구성: ${compParts.join(', ')}.`);
  }

  if (formula.efficacy) {
    parts.push(`효능은 ${formula.efficacy.join(', ')}이다.`);
  }
  if (formula.indications) {
    parts.push(`주치는 ${formula.indications.join(', ')}이다.`);
  }
  if (formula.source) {
    parts.push(`출전은 ${formula.source}이다.`);
  }
  if (formula.contraindications) {
    parts.push(`금기는 ${formula.contraindications.join(', ')}이다.`);
  }

  return parts.join(' ');
}

/**
 * 본초 herb_id + name_korean → DataNode UUID 룩업맵 구축
 * herb_id 우선, 실패 시 이름으로 fallback
 */
async function buildHerbNodeMap(
  supabaseAdmin: SupabaseClient,
  adminUserId: string,
): Promise<{ idMap: Map<string, string>; nameMap: Map<string, string> }> {
  const { data: herbNodes } = await supabaseAdmin
    .from('data_nodes')
    .select('id, domain_data')
    .eq('user_id', adminUserId)
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true);

  const idMap = new Map<string, string>();
  const nameMap = new Map<string, string>();

  for (const node of herbNodes ?? []) {
    const d = (node as any).domain_data;
    if (!d?.herb_id && !d?.name_korean) continue;
    if (d.herb_id) idMap.set(d.herb_id, node.id);
    if (d.name_korean && !nameMap.has(d.name_korean)) {
      nameMap.set(d.name_korean, node.id);
    }
  }
  return { idMap, nameMap };
}

/**
 * 구성약물에서 본초 노드 UUID 해석
 * 1순위: herb_id → idMap, 2순위: herb_name → nameMap
 */
function resolveHerbNodeId(
  comp: { herb_id: string | null; herb_name: string },
  maps: { idMap: Map<string, string>; nameMap: Map<string, string> },
): string | null {
  if (comp.herb_id) {
    const found = maps.idMap.get(comp.herb_id);
    if (found) return found;
  }
  return maps.nameMap.get(comp.herb_name) ?? null;
}

/**
 * 방제 DataNode 시드
 * @param scope 'starred' = ★ 주요 처방만, 'all' = 전체
 */
export async function seedBangjeData(
  supabaseAdmin: SupabaseClient,
  scope: 'starred' | 'all' = 'starred',
) {
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

  // 2. scope에 따라 필터
  const formulas: BangjeRawItem[] = scope === 'starred'
    ? (bangjeRaw as BangjeRawItem[]).filter(f => f.starred)
    : (bangjeRaw as BangjeRawItem[]);

  // 3. 기존 노드 중복 체크 (formula_id 기준)
  const { data: existingNodes } = await supabaseAdmin
    .from('data_nodes')
    .select('id, domain_data')
    .eq('user_id', adminUserId)
    .eq('source_type', 'manual')
    .eq('domain', 'knowledge');

  const existingFormulaIds = new Set(
    (existingNodes ?? [])
      .filter((n: any) => n.domain_data?.formula_id)
      .map((n: any) => n.domain_data.formula_id as string),
  );

  const newFormulas = formulas.filter(f => !existingFormulaIds.has(f.id));

  if (newFormulas.length === 0) {
    return {
      created: 0,
      skipped: formulas.length,
      adminUserId,
      nodes: [],
    };
  }

  // 4. 본초 노드 룩업맵 구축 (ID + 이름 fallback)
  const herbMaps = await buildHerbNodeMap(supabaseAdmin, adminUserId);

  // 5. DataNode 일괄 삽입 (배치 50개씩)
  const BATCH_SIZE = 50;
  const allInserted: { id: string; title: string }[] = [];

  for (let i = 0; i < newFormulas.length; i += BATCH_SIZE) {
    const batch = newFormulas.slice(i, i + BATCH_SIZE);

    const insertPayload = batch.map(formula => {
      const hasData = !!(formula.efficacy || formula.indications);
      const displayName = formula.hanja ? `${formula.name}(${formula.hanja})` : formula.name;

      // 구성약물에 herb_node_id 해석 (ID 우선, 이름 fallback)
      const compositionWithNodeIds = formula.composition.map(c => ({
        ...c,
        herb_node_id: resolveHerbNodeId(c, herbMaps),
      }));

      return {
        user_id: adminUserId,
        title: displayName,
        domain: 'knowledge',
        raw: buildRawText(formula),
        domain_data: makeAdminInternalDomainData({
          formula_id: formula.id,
          name_korean: formula.name,
          name_hanja: formula.hanja,
          category_major: formula.categoryMajor,
          category_minor: formula.categoryMinor,
          category_bangyak: formula.categoryBangyak,
          tags: formula.tags ?? [],
          composition: compositionWithNodeIds,
          efficacy: formula.efficacy,
          indications: formula.indications,
          source: formula.source,
          contraindications: formula.contraindications,
          modifications: formula.modifications,
          starred: formula.starred,
          lesson: formula.lesson,
          enrichment_status: hasData ? 'partial' : 'pending',
        }),
        visibility: 'public' as const,
        confidence: hasData ? 'high' : 'medium',
        source_type: 'manual',
        resolution: 'resolved',
        view_hint: 'knowledge_graph',
        importance: formula.starred ? 5 : 3,
        is_admin_node: true,
      };
    });

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('data_nodes')
      .insert(insertPayload)
      .select('id, title');

    if (insertError) {
      throw new Error(`Failed to insert bangje batch ${i}: ${insertError.message}`);
    }

    allInserted.push(...(inserted ?? []));
  }

  // 6. 각 노드에 sections + sentences 생성
  for (const node of allInserted) {
    const matchingFormula = newFormulas.find(f => {
      const displayName = f.hanja ? `${f.name}(${f.hanja})` : f.name;
      return displayName === node.title;
    });
    if (!matchingFormula) continue;

    const { data: section } = await supabaseAdmin
      .from('sections')
      .insert({
        node_id: node.id,
        heading: matchingFormula.categoryMinor ?? matchingFormula.name,
        order_idx: 0,
      })
      .select('id')
      .single();

    if (!section) continue;

    const rawText = buildRawText(matchingFormula);
    const rawSentences = rawText
      .split(/(?<=[.다])\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const sentences = rawSentences.length > 0 ? rawSentences : [rawText];

    for (let j = 0; j < sentences.length; j++) {
      await supabaseAdmin.from('sentences').insert({
        section_id: section.id,
        node_id: node.id,
        text: sentences[j],
        order_idx: j,
        embed_status: 'pending',
        embed_tier: 'hot',
      });
    }
  }

  // 7. node_relations 생성 (방제 → 본초 엣지)
  for (const node of allInserted) {
    const matchingFormula = newFormulas.find(f => {
      const displayName = f.hanja ? `${f.name}(${f.hanja})` : f.name;
      return displayName === node.title;
    });
    if (!matchingFormula) continue;

    for (const comp of matchingFormula.composition) {
      const herbNodeId = resolveHerbNodeId(comp, herbMaps);
      if (!herbNodeId) continue;

      const weight = comp.role === '군' ? 1.5
        : comp.role === '신' ? 1.2
        : comp.role === '좌' ? 1.0
        : 0.8;

      await supabaseAdmin.from('node_relations').insert({
        source_node_id: node.id,
        target_node_id: herbNodeId,
        relation_type: 'requires',
        weight,
        source: 'sql',
      });
    }
  }

  // 8. Layer 3 비동기 트리거 (임베딩 + 트리플)
  import('../pipeline/layer3').then(({ embedPendingSentences, extractTriples }) => {
    for (const node of allInserted) {
      embedPendingSentences(node.id).catch(e =>
        console.error(`[BangjeSeed] embed failed for ${node.title}:`, e),
      );
      extractTriples(node.id).catch(e =>
        console.error(`[BangjeSeed] triple failed for ${node.title}:`, e),
      );
    }
  }).catch(() => {});

  return {
    created: allInserted.length,
    skipped: existingFormulaIds.size,
    adminUserId,
    nodes: allInserted,
  };
}
