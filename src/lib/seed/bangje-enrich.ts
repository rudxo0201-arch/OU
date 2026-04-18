import type { SupabaseClient } from '@supabase/supabase-js';
import { completeWithFallback } from '../llm/router';

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

const ENRICH_SYSTEM_PROMPT = `당신은 방제학(한방처방학) 전문가입니다.
주어진 처방 목록에 대해 각각의 정보를 JSON 배열로 반환하세요.

각 처방에 대해 다음 필드를 채우세요:
- formula_id: 입력에서 받은 id (그대로 반환)
- efficacy: 효능 배열, 한국어 4자 형태 우선 (예: ["발한해표", "선폐평천"])
- indications: 주치 배열, 한국어 (예: ["외감풍한표실증", "오한발열"])
- contraindications: 금기 배열 (예: ["표허자한", "음허화왕"])
- modifications: 가감법 배열, 간략 설명 (예: ["기허가인삼", "열이 심하면 석고 가"])
- description: 1-2문장 핵심 설명 (한국어)

규칙:
1. JSON 배열만 출력하세요. 다른 텍스트 없이.
2. 확실하지 않은 정보는 빈 배열 []로 반환하세요.
3. 한국 한의학 교과서 기준으로 답하세요.
4. 구성약물(composition)은 절대 수정하지 마세요. 보강 대상이 아닙니다.`;

interface EnrichResult {
  formula_id: string;
  efficacy: string[];
  indications: string[];
  contraindications: string[];
  modifications: string[];
  description: string;
}

/**
 * 방제 LLM 보강
 * enrichment_status가 'pending' 또는 'partial'인 방제를 Haiku로 보강
 *
 * @param scope 'starred' | 'all' | 'pending'
 * @param batchSize 한 번에 보강할 방제 수 (기본 5)
 * @param dryRun true면 LLM 호출만 하고 DB 업데이트 안 함
 */
export async function enrichBangjeData(
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
  const { data: nodes, error } = await supabaseAdmin
    .from('data_nodes')
    .select('id, title, domain_data')
    .eq('user_id', adminUserId)
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true);

  if (error) throw new Error(`Query failed: ${error.message}`);

  // 방제 노드만 필터 (formula_id 존재)
  const bangjeNodes = (nodes ?? []).filter((n: any) => n.domain_data?.formula_id);

  // scope에 따라 필터
  const pendingNodes = bangjeNodes.filter((n: any) => {
    const status = n.domain_data?.enrichment_status;
    if (scope === 'pending') return status === 'pending';
    if (scope === 'starred') return n.domain_data?.starred && status !== 'enriched';
    return status !== 'enriched';
  });

  if (pendingNodes.length === 0) {
    return { enriched: 0, total: bangjeNodes.length, errors: [] };
  }

  // 3. 배치별 LLM 보강
  let enrichedCount = 0;
  const errors: { formulaId: string; error: string }[] = [];

  for (let i = 0; i < pendingNodes.length; i += batchSize) {
    const batch = pendingNodes.slice(i, i + batchSize);

    const formulaList = batch.map((n: any) => ({
      id: n.domain_data.formula_id,
      name: n.domain_data.name_korean,
      hanja: n.domain_data.name_hanja ?? '',
      category: n.domain_data.category_minor ?? '',
      composition: (n.domain_data.composition ?? []).map((c: any) =>
        `${c.herb_name}${c.dosage ? ' ' + c.dosage : ''}${c.role ? '(' + c.role + ')' : ''}`
      ).join(', '),
    }));

    try {
      const result = await completeWithFallback(
        [{ role: 'user', content: JSON.stringify(formulaList, null, 0) }],
        {
          system: ENRICH_SYSTEM_PROMPT,
          maxTokens: 2048,
          operation: 'bangje_enrich',
          userId: adminUserId,
        },
      );

      // JSON 파싱
      let enrichResults: EnrichResult[];
      try {
        const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        enrichResults = JSON.parse(cleaned);
      } catch {
        console.error(`[BangjeEnrich] JSON parse failed for batch ${i}:`, result.text.slice(0, 200));
        errors.push({ formulaId: `batch-${i}`, error: 'JSON parse failed' });
        continue;
      }

      if (dryRun) {
        console.log(`[BangjeEnrich] Dry run batch ${i}:`, JSON.stringify(enrichResults, null, 2));
        enrichedCount += enrichResults.length;
        continue;
      }

      // 4. DB 업데이트
      for (const enriched of enrichResults) {
        const matchingNode = batch.find((n: any) => n.domain_data.formula_id === enriched.formula_id);
        if (!matchingNode) continue;

        const updatedDomainData = {
          ...matchingNode.domain_data,
          efficacy: enriched.efficacy?.length ? enriched.efficacy : matchingNode.domain_data.efficacy,
          indications: enriched.indications?.length ? enriched.indications : matchingNode.domain_data.indications,
          contraindications: enriched.contraindications?.length ? enriched.contraindications : matchingNode.domain_data.contraindications,
          modifications: enriched.modifications?.length ? enriched.modifications : matchingNode.domain_data.modifications,
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
        rawParts.push(`${displayName}은(는) ${updatedDomainData.category_minor ?? '미분류'} 소속 방제이다.`);
        if (enriched.description) rawParts.push(enriched.description);

        // 구성약물
        if (updatedDomainData.composition?.length) {
          const compParts = updatedDomainData.composition.map((c: any) => {
            const herbDisplay = c.herb_hanja ? `${c.herb_name}(${c.herb_hanja})` : c.herb_name;
            const dosage = c.dosage ? ` ${c.dosage}` : '';
            const role = c.role ? `(${c.role})` : '';
            return `${herbDisplay}${dosage}${role}`;
          });
          rawParts.push(`구성: ${compParts.join(', ')}.`);
        }

        if (updatedDomainData.efficacy?.length) rawParts.push(`효능은 ${updatedDomainData.efficacy.join(', ')}이다.`);
        if (updatedDomainData.indications?.length) rawParts.push(`주치는 ${updatedDomainData.indications.join(', ')}이다.`);
        if (updatedDomainData.source) rawParts.push(`출전은 ${updatedDomainData.source}이다.`);
        if (updatedDomainData.contraindications?.length) rawParts.push(`금기는 ${updatedDomainData.contraindications.join(', ')}이다.`);

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
            console.error(`[BangjeEnrich] embed failed for ${node.title}:`, e),
          );
          extractTriples(node.id).catch(e =>
            console.error(`[BangjeEnrich] triple failed for ${node.title}:`, e),
          );
        }
      }).catch(() => {});

    } catch (batchError: any) {
      console.error(`[BangjeEnrich] Batch ${i} failed:`, batchError);
      errors.push({ formulaId: `batch-${i}`, error: batchError.message });
    }
  }

  return {
    enriched: enrichedCount,
    total: bangjeNodes.length,
    pending: pendingNodes.length - enrichedCount,
    errors,
  };
}
