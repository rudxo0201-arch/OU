/**
 * Layer 3 — 임베딩 + 트리플 추출
 *
 * 임베딩: OpenAI text-embedding-3-small (직접 호출, 전용 API)
 * 트리플 추출: Anthropic Haiku (completeWithFallback 사용, 실패 시 OpenAI 폴백)
 */

import { createClient } from '@/lib/supabase/server';
import { completeWithFallback } from '@/lib/llm/router';
import { findCachedLLMResult, logLLMCall } from '@/lib/logicization/observer';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_PREDICATES = [
  'is_a', 'part_of', 'causes', 'derived_from', 'related_to',
  'opposite_of', 'requires', 'example_of', 'involves', 'located_at', 'occurs_at',
];

/**
 * Embedding Tier 분류 기준:
 * - hot  (< 7일):  즉시 임베딩 (기존 동작)
 * - warm (7~30일): embed_tier='warm'으로 마킹, 배치 크론에서 처리
 * - cold (> 30일): embed_tier='cold'로 마킹, 임베딩 생략
 */
function classifyEmbedTier(nodeCreatedAt: string): 'hot' | 'warm' | 'cold' {
  const ageMs = Date.now() - new Date(nodeCreatedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return 'hot';
  if (ageDays <= 30) return 'warm';
  return 'cold';
}

export async function embedPendingSentences(nodeId: string) {
  const supabase = await createClient();

  // 노드의 created_at 조회하여 tier 결정
  const { data: node } = await supabase
    .from('data_nodes')
    .select('created_at')
    .eq('id', nodeId)
    .single();

  if (!node) return;

  const tier = classifyEmbedTier(node.created_at);

  const { data: sentences } = await supabase
    .from('sentences')
    .select('id, text')
    .eq('node_id', nodeId)
    .eq('embed_status', 'pending')
    .limit(50);

  if (!sentences?.length) return;

  // warm/cold tier: 임베딩 보류, tier만 마킹하고 종료
  if (tier !== 'hot') {
    for (const s of sentences) {
      await supabase
        .from('sentences')
        .update({ embed_tier: tier })
        .eq('id', s.id);
    }
    console.log(`[Layer3] Node ${nodeId} classified as ${tier} — ${sentences.length} sentences deferred`);
    return;
  }

  // hot tier: 즉시 임베딩 (기존 동작)
  const texts = sentences.map((s: { id: string; text: string }) => s.text);

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    await supabase.from('api_cost_log').insert({
      operation: 'embed',
      model: 'text-embedding-3-small',
      tokens: response.usage.total_tokens,
      cost_usd: response.usage.total_tokens * 0.00000002,
      node_id: nodeId,
    });

    for (let i = 0; i < sentences.length; i++) {
      await supabase
        .from('sentences')
        .update({
          embedding: response.data[i].embedding,
          embed_status: 'done',
          embed_tier: 'hot',
        })
        .eq('id', sentences[i].id);
    }
  } catch (err) {
    // Mark sentences as 'failed' so they don't retry infinitely
    console.error('[Layer3] OpenAI embedding failed:', err);
    for (const s of sentences) {
      await supabase
        .from('sentences')
        .update({
          embed_status: 'failed',
        })
        .eq('id', s.id);
    }
    // Don't propagate — triple extraction should still run
  }
}

const TRIPLE_SYSTEM_PROMPT = `텍스트에서 의미 있는 트리플(주어, 서술어, 목적어)을 추출하세요.

규칙:
1. 서술어는 반드시 아래 11개만 사용:
   is_a (A는 B이다), part_of (A는 B의 일부), causes (A가 B를 유발),
   derived_from (A는 B에서 유래), related_to (A는 B와 관련),
   opposite_of (A는 B의 반대), requires (A는 B를 필요로 함),
   example_of (A는 B의 예시), involves (A는 B를 포함/관여),
   located_at (A는 B에 위치), occurs_at (A는 B에 발생)
2. 주어/목적어는 구체적 명사구로 (대명사 "그것", "이것" 금지)
3. 한 문장에서 여러 트리플 가능
4. 추론이 아니라 텍스트에 명시된 관계만 추출
5. 트리플이 없으면 빈 배열 []

JSON 배열로만 출력. 설명 없이.
예: [{"subject":"인지혁명","predicate":"causes","object":"호모 사피엔스 지배"},{"subject":"강남역","predicate":"located_at","object":"서울"}]`;

export async function extractTriples(nodeId: string) {
  const supabase = await createClient();

  const { data: sentences } = await supabase
    .from('sentences')
    .select('id, text')
    .eq('node_id', nodeId)
    .limit(20);

  if (!sentences?.length) return;

  const text = sentences.map((s: { id: string; text: string }) => s.text).join('\n');

  // ── 캐시 레이어: 동일 입력이면 LLM 호출 스킵 ──
  let triples: Array<{ subject: string; predicate: string; object: string }> = [];
  let fromCache = false;

  const cached = await findCachedLLMResult('extract_triple', text);
  if (cached?.outputParsed && Array.isArray(cached.outputParsed)) {
    triples = cached.outputParsed as typeof triples;
    fromCache = true;
    console.log(`[Layer3] Cache hit for node ${nodeId} — skipping LLM call`);
  } else {
    // Haiku로 배치 추출 (비용 효율) → 실패 시 OpenAI gpt-4o-mini 폴백
    const result = await completeWithFallback(
      [{ role: 'user', content: text }],
      {
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 1024,
        system: TRIPLE_SYSTEM_PROMPT,
        operation: 'extract_triple',
        nodeId,
      },
    );

    try {
      triples = JSON.parse(result.text.replace(/```json?|```/g, '').trim());
    } catch (e) {
      console.error(`[Layer3] triple JSON parse failed for node ${nodeId}:`, result.text.slice(0, 200));
      return;
    }

    if (!Array.isArray(triples)) {
      console.error(`[Layer3] triples is not array for node ${nodeId}`);
      return;
    }

    // Observer: 파싱된 결과도 기록 (캐시 + 로직화 데이터)
    logLLMCall({
      operation: 'extract_triple',
      inputText: text,
      outputText: result.text,
      outputParsed: triples,
      model: 'claude-haiku-4-5-20251001',
      nodeId,
    }).catch(() => {});
  }

  let inserted = 0;
  let skipped = 0;
  for (const t of triples) {
    if (!t.subject || !t.predicate || !t.object) { skipped++; continue; }
    if (!VALID_PREDICATES.includes(t.predicate)) { skipped++; continue; }

    await supabase.from('triples').insert({
      node_id: nodeId,
      subject: t.subject,
      predicate: t.predicate,
      object: t.object,
      source_level: 'sentence',
      source_type: 'extracted',
      confidence: 'medium',
    });
    inserted++;
  }

  const source = fromCache ? '(cached)' : '(LLM)';
  if (skipped > 0 || fromCache) {
    console.log(`[Layer3] Node ${nodeId} ${source}: ${inserted} triples inserted, ${skipped} skipped`);
  }
}

// --- 이미지 처리 (Gemini Vision 비동기) ---

export async function processNodeImages(nodeId: string) {
  const supabase = await createClient();

  // description/ocr_text가 없는 이미지 조회
  const { data: images } = await supabase
    .from('section_images')
    .select('id, image_url, caption')
    .eq('node_id', nodeId)
    .is('description', null)
    .limit(20);

  if (!images || images.length === 0) return;

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  for (const img of images) {
    try {
      // R2에서 이미지 가져오기
      const { getSignedViewUrl } = await import('@/lib/storage/r2');
      const signedUrl = await getSignedViewUrl(img.image_url);
      const response = await fetch(signedUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      const result = await model.generateContent([
        `이 이미지를 분석해줘. 다음 JSON 형식으로 응답해:
{
  "is_meaningful": true/false,
  "description": "이미지 설명 (한국어, 1-2문장)",
  "ocr_text": "이미지 안의 텍스트/수치 (없으면 빈 문자열)",
  "type": "chart/diagram/photo/table/other"
}

is_meaningful은 이 이미지가 정보를 담고 있는지(차트/도표/사진/다이어그램) 판별.
장식용(배경/테두리/로고/아이콘)이면 false.`,
        { inlineData: { data: base64, mimeType: 'image/png' } },
      ]);

      const text = result.response.text();
      // JSON 추출 (```json ... ``` 형태일 수 있음)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.is_meaningful) {
        // 장식으로 판별 → 삭제
        await supabase.from('section_images').delete().eq('id', img.id);
        continue;
      }

      await supabase.from('section_images').update({
        description: parsed.description || null,
        ocr_text: parsed.ocr_text || null,
      }).eq('id', img.id);

      // 비용 로깅
      try {
        await supabase.from('api_cost_log').insert({
          provider: 'google',
          model: 'gemini-1.5-flash',
          purpose: 'image_analysis',
          input_tokens: 0,
          output_tokens: 0,
          estimated_cost: 0.00265,
        });
      } catch { /* 로깅 실패는 무시 */ }

    } catch (e) {
      console.error(`[Layer3] 이미지 분석 실패 (${img.id}):`, e);
    }
  }
}
