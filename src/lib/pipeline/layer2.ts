import { createAdminClient } from '@/lib/supabase/admin';
import { classifyDomain } from './classifier';
import { detectUnresolved } from './unresolved';
import { isAdminEmail } from '@/lib/auth/roles';
import { extractDomainData } from './extract-domain-data';
import { completeWithFallback } from '@/lib/llm/router';

// 수정/보충 패턴 감지
const UPDATE_PATTERNS = [
  /아까\s*말한/, /아까\s*그/, /방금\s*말한/,
  /수정/, /변경/, /업데이트/, /정정/,
  /아니고/, /아니라/, /가\s*아니라/,
  /사실은/, /실은/,
  /틀렸/, /잘못/,
  /추가로/, /그리고\s*그/, /거기에/,
];

function isUpdateMessage(text: string): boolean {
  return UPDATE_PATTERNS.some(p => p.test(text));
}

/**
 * Try to find a recent matching node to update.
 * Searches last 20 nodes for the user, matching by keyword overlap.
 */
async function findNodeToUpdate(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  userMessage: string,
  domain: string,
): Promise<{ id: string; domain_data: Record<string, any> | null } | null> {
  const { data: recentNodes } = await supabase
    .from('data_nodes')
    .select('id, raw, domain_data, domain')
    .eq('user_id', userId)
    .not('system_tags', 'cs', '{"archived"}')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!recentNodes?.length) return null;

  // Extract keywords from user message (Korean words >= 2 chars)
  const keywords = userMessage
    .replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2);

  if (keywords.length === 0) return null;

  // Score each node by keyword match
  let bestNode: (typeof recentNodes)[0] | null = null;
  let bestScore = 0;

  for (const n of recentNodes) {
    const raw = (n.raw ?? '').toLowerCase();
    const domainDataStr = JSON.stringify(n.domain_data ?? {}).toLowerCase();
    const combined = raw + ' ' + domainDataStr;

    let score = 0;
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) score++;
    }

    // Bonus for same domain
    if (n.domain === domain) score += 0.5;

    if (score > bestScore && score >= 1) {
      bestScore = score;
      bestNode = n;
    }
  }

  return bestNode ? { id: bestNode.id, domain_data: bestNode.domain_data as Record<string, any> | null } : null;
}

// ── 엔티티 추출 (LLM 기반) ──

const ENTITY_EXTRACTION_PROMPT = `사용자의 메시지에서 엔티티(인물, 장소, 사물)를 추출하세요.

규칙:
1. 인물: 이름, 호칭(엄마, 할머니, 선생님 등), 별명 모두 포함
2. 장소: 구체적 장소명, "~댁", "~집", 지역명 등
3. 사물: 구체적 사물이 언급된 경우만 (일반 명사 제외)
4. 메인 이벤트 자체는 제외 (일정, 감정 등은 메인 노드가 처리)
5. 엔티티 간 관계도 추출 (호칭에서 추론 가능한 관계 포함)
6. 화자(나/사용자)와의 관계도 추출

JSON으로만 출력:
{
  "entities": [
    {"name": "엄마", "type": "person", "relationship_to_user": "어머니"},
    {"name": "할머니", "type": "person", "relationship_to_user": "외할머니"},
    {"name": "할머니댁", "type": "location", "related_person": "할머니"}
  ],
  "relations": [
    {"from": "엄마", "to": "할머니", "relation": "고부관계"},
    {"from": "사용자", "to": "엄마", "relation": "모자관계"}
  ]
}

엔티티가 없으면 {"entities":[],"relations":[]}`;

interface ExtractedEntity {
  name: string;
  type: 'person' | 'location' | 'object';
  relationship_to_user?: string;
  related_person?: string;
}

interface ExtractedRelation {
  from: string;
  to: string;
  relation: string;
}

async function extractEntities(text: string): Promise<{
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}> {
  try {
    const result = await completeWithFallback(
      [{ role: 'user', content: text }],
      {
        system: ENTITY_EXTRACTION_PROMPT,
        maxTokens: 512,
        operation: 'extract_entities',
      },
    );

    // LLM 응답에서 JSON 추출 (설명 텍스트가 붙어있을 수 있음)
    const cleanText = result.text.replace(/```json?|```/g, '').trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Layer2] No JSON found in entity extraction response:', cleanText.slice(0, 200));
      return { entities: [], relations: [] };
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      relations: Array.isArray(parsed.relations) ? parsed.relations : [],
    };
  } catch (e) {
    console.error('[Layer2] entity extraction failed:', e);
    return { entities: [], relations: [] };
  }
}

/**
 * 엔티티별 서브 노드 생성 + 트리플 연결
 * - 기존 노드가 있으면 연결만 (중복 방지)
 * - 없으면 새로 생성
 */
async function createEntityNodes(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  mainNodeId: string,
  entities: ExtractedEntity[],
  relations: ExtractedRelation[],
) {
  const entityNodeMap: Record<string, string> = {}; // name → node_id

  for (const entity of entities) {
    // 중복 체크: 같은 사용자의 같은 이름 노드가 있는지
    const domainForType = entity.type === 'person' ? 'relation'
      : entity.type === 'location' ? 'location'
      : 'knowledge';

    const { data: existing } = await supabase
      .from('data_nodes')
      .select('id')
      .eq('user_id', userId)
      .eq('domain', domainForType)
      .ilike('raw', `%${entity.name}%`)
      .limit(1)
      .single();

    let entityNodeId: string;

    if (existing) {
      entityNodeId = existing.id;
    } else {
      // 새 노드 생성
      const domainData: Record<string, any> = {};
      if (entity.type === 'person') {
        domainData.name = entity.name;
        if (entity.relationship_to_user) {
          domainData.relationship = entity.relationship_to_user;
        }
      } else if (entity.type === 'location') {
        domainData.name = entity.name;
      }

      const { data: newNode } = await supabase.from('data_nodes').insert({
        user_id: userId,
        domain: domainForType,
        raw: entity.name,
        source_type: 'extracted',
        confidence: 'medium',
        resolution: 'resolved',
        visibility: 'private',
        domain_data: domainData,
      }).select('id').single();

      if (!newNode) continue;
      entityNodeId = newNode.id;
    }

    entityNodeMap[entity.name] = entityNodeId;

    // 메인 노드 ↔ 엔티티 노드 트리플 연결
    const predicate = entity.type === 'person' ? 'involves'
      : entity.type === 'location' ? 'located_at'
      : 'related_to';

    await supabase.from('triples').insert({
      node_id: mainNodeId,
      subject: '이벤트',
      predicate,
      object: entity.name,
      source_level: 'node',
      source_type: 'generated',
      confidence: 'medium',
    });
  }

  // 엔티티 간 관계 트리플 생성
  for (const rel of relations) {
    const fromNodeId = entityNodeMap[rel.from] ?? (rel.from === '사용자' ? null : null);
    const toNodeId = entityNodeMap[rel.to];

    if (toNodeId) {
      // 트리플은 관련 노드 중 하나에 귀속
      await supabase.from('triples').insert({
        node_id: toNodeId,
        subject: rel.from,
        predicate: 'related_to',
        object: rel.to,
        source_level: 'node',
        source_type: 'generated',
        confidence: 'medium',
      });
    }
  }

  return entityNodeMap;
}

interface SaveMessageInput {
  userId?: string;
  groupId?: string | null;
  userMessage: string;
  assistantMessage: string;
}

export async function saveMessageAsync(input: SaveMessageInput) {
  const supabase = createAdminClient();

  // 비로그인은 메시지/노드 저장 스킵 (DB FK 제약)
  if (!input.userId) {
    const { domain, viewHint, confidence: conf } = await classifyDomain(
      input.userMessage + '\n' + input.assistantMessage
    );
    return { node: null, domain, viewHint, confidence: conf };
  }

  const { data: userMsg, error: msgErr } = await supabase.from('messages').insert({
    user_id: input.userId,
    role: 'user',
    raw: input.userMessage,
    type: 'chat',
  }).select().single();

  if (msgErr || !userMsg) {
    console.error('[Layer2] message insert failed:', msgErr?.message);
    // 메시지 저장 실패 시에도 DataNode 생성은 진행 (데이터 손실 방지)
    // 하지만 pair_id 없이 assistant 메시지 저장
  }

  const { data: assistantMsg } = await supabase.from('messages').insert({
    user_id: input.userId,
    role: 'assistant',
    raw: input.assistantMessage,
    type: 'chat',
    pair_id: userMsg?.id ?? null,
  }).select().single();

  const { domain, viewHint, confidence } = await classifyDomain(
    input.userMessage + '\n' + input.assistantMessage
  );

  // Update detection: if the user is correcting/supplementing existing data
  if (isUpdateMessage(input.userMessage)) {
    try {
      const existing = await findNodeToUpdate(
        supabase,
        input.userId,
        input.userMessage,
        domain,
      );

      if (existing) {
        // 기존 raw에 append (히스토리 보존)
        const { data: currentNode } = await supabase
          .from('data_nodes')
          .select('raw')
          .eq('id', existing.id)
          .single();

        const mergedRaw = currentNode?.raw
          ? `${currentNode.raw}\n---\n${input.userMessage}`
          : input.userMessage;

        const { error: updateErr } = await supabase
          .from('data_nodes')
          .update({
            raw: mergedRaw,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (!updateErr) {
          // Still save messages for history
          // Return the updated node
          return { node: { id: existing.id } as any, domain, viewHint, confidence };
        }
        // If update fails, fall through to insert
      }
    } catch (e) {
      console.error('[Layer2] update detection failed, falling through to insert:', e);
    }
  }

  // 관리자가 채팅으로 생성하는 노드는 기본적으로 운영 데이터로 격리
  let adminInternalData: Record<string, any> | undefined;
  if (input.userId) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', input.userId)
      .single();

    if (userProfile?.email && isAdminEmail(userProfile.email)) {
      adminInternalData = { _admin_internal: true, _visibility_locked: true };
    }
  }

  const domainDataRaw = extractDomainData(input.userMessage, domain);
  // DB 저장용: _ 접두사 내부 플래그 제거
  const domainData = {
    ...Object.fromEntries(Object.entries(domainDataRaw).filter(([k]) => !k.startsWith('_'))),
    ...(adminInternalData ?? {}),
  };

  const { data: node, error: nodeErr } = await supabase.from('data_nodes').insert({
    user_id: input.userId,
    group_id: input.groupId ?? null,
    message_id: assistantMsg?.id,
    domain,
    raw: input.userMessage,
    source_type: 'chat',
    confidence,
    resolution: 'resolved',
    view_hint: viewHint,
    visibility: 'private',
    domain_data: domainData,
  }).select().single();

  if (nodeErr) {
    console.error('[Layer2] data_node insert failed:', nodeErr.message);
    return { node: null, domain, viewHint, confidence };
  }

  if (node) {
    // Section + Sentences 생성 (Layer 3가 처리할 수 있도록)
    try {
      const { data: sec } = await supabase.from('sections').insert({
        node_id: node.id,
        heading: domain ?? 'chat',
        order_idx: 0,
      }).select().single();

      if (sec) {
        // 문장 분리: ". " / "。" / 줄바꿈 기준
        const rawSentences = input.userMessage
          .split(/(?<=[.!?])\s+|。|\n+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);

        // 최소 1개 문장 보장
        const sentences = rawSentences.length > 0 ? rawSentences : [input.userMessage.trim()];

        for (let j = 0; j < sentences.length; j++) {
          await supabase.from('sentences').insert({
            section_id: sec.id,
            node_id: node.id,
            text: sentences[j],
            order_idx: j,
            embed_status: 'pending',
            embed_tier: 'hot',
          });
        }
      }
    } catch (e) {
      console.error('[Layer2] section/sentence insert failed:', e);
    }

    // UNRESOLVED 감지: 대명사 + 빈 필드 + 모호한 날짜 (실패해도 무시)
    detectUnresolved({
      userId: input.userId,
      nodeId: node.id,
      text: input.userMessage,
      domain,
      domainData: domainDataRaw,
      contextSnippet: [
        { role: 'user', text: input.userMessage },
        { role: 'assistant', text: input.assistantMessage },
      ],
    }).catch(e => console.error('[Layer2] unresolved failed:', e));

    // 엔티티 추출 + 서브 노드 생성 (비동기, 실패 무시)
    console.log('[Layer2] Starting entity extraction for:', input.userMessage.slice(0, 50));
    extractEntities(input.userMessage).then(({ entities, relations }) => {
      console.log('[Layer2] Entities extracted:', JSON.stringify(entities));
      console.log('[Layer2] Relations extracted:', JSON.stringify(relations));
      if (entities.length > 0) {
        createEntityNodes(supabase, input.userId!, node.id, entities, relations)
          .then((map) => console.log('[Layer2] Entity nodes created:', JSON.stringify(map)))
          .catch(e => console.error('[Layer2] entity node creation failed:', e));
      } else {
        console.log('[Layer2] No entities found, skipping node creation');
      }
    }).catch(e => console.error('[Layer2] entity extraction failed:', e));

    // Layer 3: 임베딩 + 트리플 (비동기, 실패 무시)
    import('./layer3').then(({ embedPendingSentences, extractTriples }) => {
      embedPendingSentences(node.id).catch(e => console.error('[Layer3] embed failed:', e));
      extractTriples(node.id).catch(e => console.error('[Layer3] triple failed:', e));
    }).catch(() => {});
  }

  // 토큰 사용량 기록 (대략 추정: 한글 1자 ≈ 2토큰, 영어 1단어 ≈ 1토큰)
  const estimatedTokens = Math.max(
    1,
    Math.ceil((input.userMessage.length + input.assistantMessage.length) / 2)
  );
  await supabase.from('token_usage').insert({
    user_id: input.userId,
    operation: 'chat',
    tokens_used: estimatedTokens,
  });

  return { node, domain, viewHint, confidence };
}
