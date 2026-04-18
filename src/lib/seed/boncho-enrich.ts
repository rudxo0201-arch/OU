import type { SupabaseClient } from '@supabase/supabase-js';
import { completeWithFallback } from '../llm/router';

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

const ENRICH_SYSTEM_PROMPT = `당신은 본초학(한약학) 전문가입니다.
주어진 본초 목록에 대해 각각의 약성 정보를 JSON 배열로 반환하세요.

각 본초에 대해 다음 필드를 채우세요:
- herb_id: 입력에서 받은 id (그대로 반환)
- nature: 성(性) 배열 (예: ["溫"], ["寒"], ["微寒"], ["平"])
- flavor: 미(味) 배열 (예: ["甘"], ["苦", "辛"])
- channel_tropism: 귀경 배열, 한자로 (예: ["脾", "肺", "心"])
- efficacy: 효능 배열, 한국어 4자 형태 우선 (예: ["보기승양", "고표지한", "이수소종"])
- indications: 주치 배열, 한국어 (예: ["기허핍력", "식소변당", "자한도한"])
- description: 1-2문장 핵심 설명 (한국어)

규칙:
1. JSON 배열만 출력하세요. 다른 텍스트 없이.
2. 확실하지 않은 정보는 빈 배열 []로 반환하세요.
3. 한국 한의학 교과서 기준으로 답하세요.
4. 귀경은 반드시 한자(臟腑名)로 적으세요.`;

interface EnrichResult {
  herb_id: string;
  nature: string[];
  flavor: string[];
  channel_tropism: string[];
  efficacy: string[];
  indications: string[];
  description: string;
}

/**
 * 본초 LLM 보강
 * enrichment_status가 'pending'인 본초를 Haiku로 보강
 *
 * @param scope 'starred' | 'all' | 'pending'
 * @param batchSize 한 번에 보강할 본초 수 (기본 5)
 * @param dryRun true면 LLM 호출만 하고 DB 업데이트 안 함
 */
export async function enrichBonchoData(
  supabaseAdmin: SupabaseClient,
  scope: 'starred' | 'all' | 'pending' = 'pending',
  batchSize = 5,
  dryRun = false,
) {
  // 1. 관리자 유저 조회
  const { data: adminUsers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1);

  const adminUserId = adminUsers?.[0]?.id;
  if (!adminUserId) throw new Error('Admin user not found');

  // 2. 보강 대상 조회
  let query = supabaseAdmin
    .from('data_nodes')
    .select('id, title, domain_data')
    .eq('user_id', adminUserId)
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true);

  const { data: nodes, error } = await query;
  if (error) throw new Error(`Query failed: ${error.message}`);

  // 본초 노드만 필터 (herb_id 존재)
  const bonchoNodes = (nodes ?? []).filter((n: any) => n.domain_data?.herb_id);

  // scope에 따라 필터
  const pendingNodes = bonchoNodes.filter((n: any) => {
    const status = n.domain_data?.enrichment_status;
    if (scope === 'pending') return status === 'pending';
    if (scope === 'starred') return n.domain_data?.starred && status !== 'enriched';
    return status !== 'enriched';
  });

  if (pendingNodes.length === 0) {
    return { enriched: 0, total: bonchoNodes.length, errors: [] };
  }

  // 3. 배치별 LLM 보강
  let enrichedCount = 0;
  const errors: { herbId: string; error: string }[] = [];

  for (let i = 0; i < pendingNodes.length; i += batchSize) {
    const batch = pendingNodes.slice(i, i + batchSize);

    const herbList = batch.map((n: any) => ({
      id: n.domain_data.herb_id,
      name: n.domain_data.name_korean,
      hanja: n.domain_data.name_hanja ?? '',
      category: n.domain_data.category_minor ?? '',
    }));

    try {
      const result = await completeWithFallback(
        [{ role: 'user', content: JSON.stringify(herbList, null, 0) }],
        {
          system: ENRICH_SYSTEM_PROMPT,
          maxTokens: 2048,
          operation: 'boncho_enrich',
          userId: adminUserId,
        },
      );

      // JSON 파싱
      let enrichResults: EnrichResult[];
      try {
        const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        enrichResults = JSON.parse(cleaned);
      } catch {
        console.error(`[BonchoEnrich] JSON parse failed for batch ${i}:`, result.text.slice(0, 200));
        errors.push({ herbId: `batch-${i}`, error: 'JSON parse failed' });
        continue;
      }

      if (dryRun) {
        console.log(`[BonchoEnrich] Dry run batch ${i}:`, JSON.stringify(enrichResults, null, 2));
        enrichedCount += enrichResults.length;
        continue;
      }

      // 4. DB 업데이트
      for (const enriched of enrichResults) {
        const matchingNode = batch.find((n: any) => n.domain_data.herb_id === enriched.herb_id);
        if (!matchingNode) continue;

        const updatedDomainData = {
          ...matchingNode.domain_data,
          nature: enriched.nature?.length ? enriched.nature : matchingNode.domain_data.nature,
          flavor: enriched.flavor?.length ? enriched.flavor : matchingNode.domain_data.flavor,
          channel_tropism: enriched.channel_tropism?.length ? enriched.channel_tropism : matchingNode.domain_data.channel_tropism,
          efficacy: enriched.efficacy?.length ? enriched.efficacy : matchingNode.domain_data.efficacy,
          indications: enriched.indications?.length ? enriched.indications : matchingNode.domain_data.indications,
          description: enriched.description || matchingNode.domain_data.description,
          enrichment_status: 'enriched',
          enriched_at: new Date().toISOString(),
          enrichment_model: 'claude-haiku-4-5-latest',
        };

        // raw 텍스트 재생성
        const displayName = updatedDomainData.name_hanja
          ? `${updatedDomainData.name_korean}(${updatedDomainData.name_hanja})`
          : updatedDomainData.name_korean;

        const rawParts: string[] = [];
        rawParts.push(`${displayName}은(는) ${updatedDomainData.category_minor ?? '미분류'} 소속 본초이다.`);
        if (enriched.description) rawParts.push(enriched.description);
        if (updatedDomainData.nature?.length) rawParts.push(`성(性)은 ${updatedDomainData.nature.join(', ')}이다.`);
        if (updatedDomainData.flavor?.length) rawParts.push(`미(味)는 ${updatedDomainData.flavor.join(', ')}이다.`);
        if (updatedDomainData.channel_tropism?.length) rawParts.push(`귀경은 ${updatedDomainData.channel_tropism.join(', ')}이다.`);
        if (updatedDomainData.efficacy?.length) rawParts.push(`효능은 ${updatedDomainData.efficacy.join(', ')}이다.`);
        if (updatedDomainData.indications?.length) rawParts.push(`주치는 ${updatedDomainData.indications.join(', ')}이다.`);

        const newRaw = rawParts.join(' ');

        // DataNode 업데이트
        await supabaseAdmin
          .from('data_nodes')
          .update({
            domain_data: updatedDomainData,
            raw: newRaw,
            confidence: 'high',
          })
          .eq('id', matchingNode.id);

        // 기존 sentences 삭제 후 재생성
        const { data: existingSections } = await supabaseAdmin
          .from('sections')
          .select('id')
          .eq('node_id', matchingNode.id);

        if (existingSections?.length) {
          for (const sec of existingSections) {
            await supabaseAdmin.from('sentences').delete().eq('section_id', sec.id);
          }
          await supabaseAdmin.from('sections').delete().eq('node_id', matchingNode.id);
        }

        // 새 section + sentences
        const { data: section } = await supabaseAdmin
          .from('sections')
          .insert({
            node_id: matchingNode.id,
            heading: updatedDomainData.category_minor ?? updatedDomainData.name_korean,
            order_idx: 0,
          })
          .select('id')
          .single();

        if (section) {
          const sentences = newRaw
            .split(/(?<=[.다])\s+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

          for (let j = 0; j < sentences.length; j++) {
            await supabaseAdmin.from('sentences').insert({
              section_id: section.id,
              node_id: matchingNode.id,
              text: sentences[j],
              order_idx: j,
              embed_status: 'pending',
              embed_tier: 'hot',
            });
          }
        }

        enrichedCount++;
      }

      // 5. 배치 완료 후 Layer 3 트리거
      import('../pipeline/layer3').then(({ embedPendingSentences, extractTriples }) => {
        for (const node of batch) {
          embedPendingSentences(node.id).catch(e =>
            console.error(`[BonchoEnrich] embed failed for ${node.title}:`, e),
          );
          extractTriples(node.id).catch(e =>
            console.error(`[BonchoEnrich] triple failed for ${node.title}:`, e),
          );
        }
      }).catch(() => {});

    } catch (batchError: any) {
      console.error(`[BonchoEnrich] Batch ${i} failed:`, batchError);
      errors.push({ herbId: `batch-${i}`, error: batchError.message });
    }
  }

  return {
    enriched: enrichedCount,
    total: bonchoNodes.length,
    pending: pendingNodes.length - enrichedCount,
    errors,
  };
}
