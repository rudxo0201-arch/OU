import type { SupabaseClient } from '@supabase/supabase-js';
import { makeAdminInternalDomainData } from './admin-seed';
import bonchoRaw from '@/data/boncho-raw.json';

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

interface BonchoRawItem {
  id: string;
  name: string;
  hanja: string | null;
  starred: boolean;
  categoryMajor: string | null;
  categoryMinor: string | null;
  nature: string[] | null;
  flavor: string[] | null;
  channelTropism: string[] | null;
  efficacy: string[] | null;
  indications: string[] | null;
  lesson: string | null;
  sasang: string | null;
}

/**
 * 본초 raw 데이터를 DataNode raw 텍스트로 변환
 * (보강 전 기본형 / 보강 후 상세형)
 */
function buildRawText(herb: BonchoRawItem): string {
  const displayName = herb.hanja
    ? `${herb.name}(${herb.hanja})`
    : herb.name;

  const parts: string[] = [`${displayName}은(는) ${herb.categoryMinor ?? '미분류'} 소속 본초이다.`];

  if (herb.nature) {
    parts.push(`성(性)은 ${herb.nature.join(', ')}이다.`);
  }
  if (herb.flavor) {
    parts.push(`미(味)는 ${herb.flavor.join(', ')}이다.`);
  }
  if (herb.channelTropism) {
    parts.push(`귀경은 ${herb.channelTropism.join(', ')}이다.`);
  }
  if (herb.efficacy) {
    parts.push(`효능은 ${herb.efficacy.join(', ')}이다.`);
  }
  if (herb.indications) {
    parts.push(`주치는 ${herb.indications.join(', ')}이다.`);
  }

  return parts.join(' ');
}

/**
 * 본초 DataNode 시드
 * @param scope 'starred' = ★ 91개만, 'all' = 504개 전체
 */
export async function seedBonchoData(
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
  const herbs: BonchoRawItem[] = scope === 'starred'
    ? (bonchoRaw as BonchoRawItem[]).filter(h => h.starred)
    : (bonchoRaw as BonchoRawItem[]);

  // 3. 기존 노드 중복 체크 (herb_id 기준)
  const herbIds = herbs.map(h => h.id);
  const { data: existingNodes } = await supabaseAdmin
    .from('data_nodes')
    .select('id, domain_data')
    .eq('user_id', adminUserId)
    .eq('source_type', 'manual')
    .eq('domain', 'knowledge');

  const existingHerbIds = new Set(
    (existingNodes ?? [])
      .filter((n: any) => n.domain_data?.herb_id)
      .map((n: any) => n.domain_data.herb_id as string),
  );

  const newHerbs = herbs.filter(h => !existingHerbIds.has(h.id));

  if (newHerbs.length === 0) {
    return {
      created: 0,
      skipped: herbs.length,
      adminUserId,
      nodes: [],
    };
  }

  // 4. DataNode 일괄 삽입 (배치 50개씩)
  const BATCH_SIZE = 50;
  const allInserted: { id: string; raw: string }[] = [];

  for (let i = 0; i < newHerbs.length; i += BATCH_SIZE) {
    const batch = newHerbs.slice(i, i + BATCH_SIZE);

    const insertPayload = batch.map(herb => {
      const hasData = !!(herb.nature || herb.flavor || herb.channelTropism || herb.efficacy || herb.indications);

      return {
        user_id: adminUserId,
        domain: 'knowledge',
        raw: buildRawText(herb),
        domain_data: makeAdminInternalDomainData({
          herb_id: herb.id,
          name_korean: herb.name,
          name_hanja: herb.hanja,
          category_major: herb.categoryMajor,
          category_minor: herb.categoryMinor,
          starred: herb.starred,
          nature: herb.nature,
          flavor: herb.flavor,
          channel_tropism: herb.channelTropism,
          efficacy: herb.efficacy,
          indications: herb.indications,
          lesson: herb.lesson,
          sasang: herb.sasang,
          enrichment_status: hasData ? 'partial' : 'pending',
        }),
        visibility: 'public' as const,
        confidence: hasData ? 'high' : 'medium',
        source_type: 'manual',
        resolution: 'resolved',
        view_hint: 'knowledge_graph',
        is_admin_node: true,
      };
    });

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('data_nodes')
      .insert(insertPayload)
      .select('id, raw');

    if (insertError) {
      throw new Error(`Failed to insert boncho batch ${i}: ${insertError.message}`);
    }

    allInserted.push(...(inserted ?? []));
  }

  // 5. 각 노드에 sections + sentences 생성
  for (const node of allInserted) {
    const matchingHerb = newHerbs.find(h => {
      const displayName = h.hanja ? `${h.name}(${h.hanja})` : h.name;
      return node.raw?.startsWith(displayName);
    });
    if (!matchingHerb) continue;

    const { data: section } = await supabaseAdmin
      .from('sections')
      .insert({
        node_id: node.id,
        heading: matchingHerb.categoryMinor ?? matchingHerb.name,
        order_idx: 0,
      })
      .select('id')
      .single();

    if (!section) continue;

    const rawText = buildRawText(matchingHerb);
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

  // 6. Layer 3 비동기 트리거 (임베딩 + 트리플)
  import('../pipeline/layer3').then(({ embedPendingSentences, extractTriples }) => {
    for (const node of allInserted) {
      embedPendingSentences(node.id).catch(e =>
        console.error(`[BonchoSeed] embed failed for ${node.raw?.slice(0, 30)}:`, e),
      );
      extractTriples(node.id).catch(e =>
        console.error(`[BonchoSeed] triple failed for ${node.raw?.slice(0, 30)}:`, e),
      );
    }
  }).catch(() => {});

  return {
    created: allInserted.length,
    skipped: existingHerbIds.size,
    adminUserId,
    nodes: allInserted,
  };
}
