import { createAdminClient } from '@/lib/supabase/admin';
import { classifyDomain } from './classifier';
import { detectUnresolved } from './unresolved';
import { isAdminEmail } from '@/lib/auth/roles';
import { extractAll } from './extraction';

/** 텍스트를 빈 줄 기준으로 섹션 분리. 마크다운 헤딩/볼드 제목 있으면 heading으로 추출 */
function splitIntoSections(text: string): Array<{ heading: string; body: string }> {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
  if (paragraphs.length === 0) return [{ heading: 'chat', body: text.trim() }];

  return paragraphs.map((para, i) => {
    const headingMatch = para.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      const body = para.replace(/^#{1,3}\s+.+\n?/, '').trim();
      return { heading: headingMatch[1].trim(), body: body || para };
    }
    const boldMatch = para.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      const body = para.replace(/^\*\*.+?\*\*\n?/, '').trim();
      return { heading: boldMatch[1].trim(), body: body || para };
    }
    return { heading: `Section ${i + 1}`, body: para };
  });
}

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

import type { ExtractedEntity, ExtractedRelation } from './extraction';

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
      : entity.type === 'organization' ? 'relation'
      : entity.type === 'attribute' ? 'knowledge'
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
      const domainData: Record<string, any> = { name: entity.name };
      if (entity.type === 'person') {
        if (entity.relationship_to_user) domainData.relationship = entity.relationship_to_user;
      } else if (entity.type === 'organization') {
        if (entity.subtype) domainData.subtype = entity.subtype;
      } else if (entity.type === 'attribute') {
        if (entity.subtype) domainData.subtype = entity.subtype;
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
      : entity.type === 'organization' ? 'involves'
      : entity.type === 'attribute' ? 'related_to'
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
  /** Suggestion 답변 시 연결할 기존 노드 ID — 있으면 INSERT 대신 UPDATE */
  linkedNodeId?: string | null;
  /** Sonnet의 json:meta에서 파싱한 도메인 힌트 — 있으면 classifyDomain() 스킵 */
  domainHint?: string;
  /** Sonnet이 json:meta segments로 분리한 의미 단위 — 있으면 각 segment별 DataNode 생성 */
  segments?: Array<{ text: string; domain: string }>;
  /** Orb 전용 입력창에서 주입하는 추가 컨텍스트 (subject_type, subject_name 등) — extraction 결과에 병합 */
  context?: Record<string, any>;
}

export async function saveMessageAsync(input: SaveMessageInput) {
  const supabase = createAdminClient();

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

  // 비로그인은 메시지/노드 저장 스킵 (DB FK 제약)
  if (!input.userId) {
    if (input.domainHint) {
      return { node: null, domain: input.domainHint, viewHint: null, confidence: 'high' };
    }
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

  // domainHint(Sonnet의 json:meta)가 있으면 분류 스킵 — LLM 1회 절약
  let domain: string;
  let viewHint: string | null;
  let confidence: 'high' | 'medium' | 'low';

  if (input.domainHint) {
    domain = input.domainHint;
    viewHint = null;
    confidence = 'high';
  } else {
    const classified = await classifyDomain(
      input.userMessage + '\n' + input.assistantMessage
    );
    domain = classified.domain;
    viewHint = classified.viewHint;
    confidence = classified.confidence;
  }

  // linkedNodeId: suggestion 답변 → 해당 노드에 정보 병합 (새 노드 생성 안 함)
  if (input.linkedNodeId && input.userId) {
    try {
      const { data: existingNode } = await supabase
        .from('data_nodes')
        .select('raw, domain, domain_data')
        .eq('id', input.linkedNodeId)
        .eq('user_id', input.userId)
        .single();

      if (existingNode) {
        const mergedRaw = existingNode.raw
          ? `${existingNode.raw}\n---\n${input.userMessage}`
          : input.userMessage;

        // 원래 노드의 도메인으로 추출 (새 분류 domain이 아닌 — 도메인별 필드 정확히 추출)
        const originalDomain = (existingNode.domain as string) || domain;
        const extractionResult = await extractAll(input.userMessage, originalDomain, today);
        const additionalData = extractionResult.domain_data;
        // date는 기존 값 보존 (새 답변에서 날짜 추출 실패 시 today 기본값으로 덮어쓰기 방지)
        const existing = existingNode.domain_data as Record<string, any> ?? {};
        if (existing.date) {
          delete additionalData.date;
        }
        const mergedDomainData = { ...existing, ...additionalData };

        await supabase.from('data_nodes').update({
          raw: mergedRaw,
          domain_data: mergedDomainData,
          updated_at: new Date().toISOString(),
        }).eq('id', input.linkedNodeId);

        // 엔티티 서브 노드 생성 (extractAll 결과 재활용)
        if (extractionResult.entities.length > 0) {
          createEntityNodes(supabase, input.userId!, input.linkedNodeId!, extractionResult.entities, extractionResult.relations)
            .catch(e => console.error('[Layer2] entity nodes for linked node failed:', e));
        }

        // 토큰 사용량 기록
        const estimatedTokens = Math.max(1, Math.ceil((input.userMessage.length + input.assistantMessage.length) / 2));
        void supabase.from('token_usage').insert({ user_id: input.userId, operation: 'chat', tokens_used: estimatedTokens });

        return { node: { id: input.linkedNodeId } as any, domain: originalDomain, viewHint, confidence };
      }
    } catch (e) {
      console.error('[Layer2] linkedNodeId update failed, falling through:', e);
    }
  }

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

  // ── 세그먼트별 노드 생성 헬퍼 ──
  async function createNodeForSegment(
    segmentText: string,
    segmentDomain: string,
    messageId: string | undefined,
    adminData: Record<string, any> | undefined,
    assistantContext?: string,
  ) {
    // 세그먼트는 LLM이 이미 분리한 단위 — assistant 컨텍스트 포함 시 다른 세그먼트 정보까지 추출되어 중복 노드 생성됨
    const segCombined = segmentText;
    const segExtraction = await extractAll(segCombined, segmentDomain, today);
    const segDomainData = { ...segExtraction.domain_data, ...(adminData ?? {}) };

    // confidence low = 필수 필드 누락 → INSERT 중단
    if (segExtraction.confidence === 'low') {
      console.warn('[Layer2] segment extraction confidence low, skipping insert:', segmentDomain, segCombined.slice(0, 80));
      return null;
    }

    const { data: segNode, error: segErr } = await supabase.from('data_nodes').insert({
      user_id: input.userId,
      group_id: input.groupId ?? null,
      message_id: messageId ?? null,
      domain: segmentDomain,
      raw: segCombined,
      source_type: 'chat',
      confidence: segExtraction.confidence,
      resolution: 'resolved',
      visibility: 'private',
      domain_data: segDomainData,
    }).select().single();

    if (segErr || !segNode) {
      console.error('[Layer2] segment node insert failed:', segErr?.message);
      return null;
    }

    // Section + Sentences (문단별 섹션 분리)
    try {
      const segSectionParts = splitIntoSections(segCombined);

      for (let i = 0; i < segSectionParts.length; i++) {
        const { heading, body } = segSectionParts[i];
        const { data: sec } = await supabase.from('sections').insert({
          node_id: segNode.id,
          heading,
          order_idx: i,
        }).select().single();

        if (sec) {
          const rawSentences = body
            .split(/(?<=[.!?])\s+|。|\n+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
          const sentences = rawSentences.length > 0 ? rawSentences : [body.trim()];
          for (let j = 0; j < sentences.length; j++) {
            await supabase.from('sentences').insert({
              section_id: sec.id,
              node_id: segNode.id,
              text: sentences[j],
              order_idx: j,
              embed_status: 'pending',
              embed_tier: 'hot',
            });
          }
        }
      }
    } catch (e) {
      console.error('[Layer2] segment section/sentence insert failed:', e);
    }

    // Entity nodes
    if (segExtraction.entities.length > 0) {
      createEntityNodes(supabase, input.userId!, segNode.id, segExtraction.entities, segExtraction.relations)
        .catch(e => console.error('[Layer2] segment entity node creation failed:', e));
    }

    // Layer 3
    import('./layer3').then(({ embedPendingSentences, extractTriples }) => {
      embedPendingSentences(segNode.id).catch(e => console.error('[Layer3] segment embed failed:', e));
      extractTriples(segNode.id, segmentDomain).catch(e => console.error('[Layer3] segment triple failed:', e));
    }).catch(() => {});

    return segNode;
  }

  // ── 다중 세그먼트 처리 ──
  if (input.segments && input.segments.length > 1) {
    const [primarySeg, ...restSegs] = input.segments;

    const primaryNode = await createNodeForSegment(
      primarySeg.text,
      primarySeg.domain,
      assistantMsg?.id,
      adminInternalData,
      input.assistantMessage,
    );

    const additionalResults = await Promise.all(
      restSegs.map(seg =>
        createNodeForSegment(seg.text, seg.domain, assistantMsg?.id, adminInternalData, input.assistantMessage)
      )
    );

    const estimatedTokens = Math.max(
      1,
      Math.ceil((input.userMessage.length + input.assistantMessage.length) / 2)
    );
    await supabase.from('token_usage').insert({
      user_id: input.userId,
      operation: 'chat',
      tokens_used: estimatedTokens,
    });

    return {
      node: primaryNode,
      domain: primarySeg.domain,
      viewHint: null,
      confidence,
      additionalNodes: additionalResults
        .filter((n): n is NonNullable<typeof n> => n !== null)
        .map(n => ({ id: n.id, domain: n.domain as string, domain_data: n.domain_data as Record<string, any> })),
    };
  }

  // ── 단일 세그먼트 (기존 경로) ──
  // assistant 답변을 포함한 combined text로 추출 — 문서 파싱과 동일 원칙 (문단→문장)
  const combinedForExtraction = input.assistantMessage
    ? `${input.userMessage}\n\n${input.assistantMessage}`
    : input.userMessage;
  const extractionResult = await extractAll(combinedForExtraction, domain, today);
  const domainData = {
    ...(input.context ?? {}),          // Orb context 먼저 (subject_type, subject_name 등)
    ...extractionResult.domain_data,   // LLM 추출 결과로 덮어씀 (더 구체적인 값 우선)
    ...(adminInternalData ?? {}),
  };

  // confidence low = 필수 필드 누락 → INSERT 중단
  if (extractionResult.confidence === 'low') {
    console.warn('[Layer2] extraction confidence low, skipping insert:', domain, combinedForExtraction.slice(0, 80));
    return { node: null, domain, viewHint, confidence: 'low' };
  }

  // LLM이 여러 항목을 배열로 반환한 경우 → 각각 별도 노드 INSERT
  if (extractionResult.domain_data_list && extractionResult.domain_data_list.length > 1) {
    const baseRow = {
      user_id: input.userId,
      group_id: input.groupId ?? null,
      message_id: assistantMsg?.id,
      domain,
      raw: combinedForExtraction,
      source_type: 'chat',
      confidence,
      resolution: 'resolved',
      view_hint: viewHint,
      visibility: 'private',
    };
    const insertResults = await Promise.all(
      extractionResult.domain_data_list.map(dd =>
        supabase.from('data_nodes').insert({ ...baseRow, domain_data: dd }).select().single()
      )
    );
    const firstNode = insertResults[0]?.data ?? null;
    console.log(`[Layer2] multi-node insert: ${insertResults.length} nodes for domain=${domain}`);
    return { node: firstNode, domain, viewHint, confidence };
  }

  const { data: node, error: nodeErr } = await supabase.from('data_nodes').insert({
    user_id: input.userId,
    group_id: input.groupId ?? null,
    message_id: assistantMsg?.id,
    domain,
    raw: combinedForExtraction,
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
    // Section + Sentences 생성 (userMessage + assistantMessage 합쳐서 문단별 섹션 분리)
    try {
      const sectionParts = splitIntoSections(combinedForExtraction);

      for (let i = 0; i < sectionParts.length; i++) {
        const { heading, body } = sectionParts[i];
        const { data: sec } = await supabase.from('sections').insert({
          node_id: node.id,
          heading,
          order_idx: i,
        }).select().single();

        if (sec) {
          const rawSentences = body
            .split(/(?<=[.!?])\s+|。|\n+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
          const sentences = rawSentences.length > 0 ? rawSentences : [body.trim()];

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
      domainData: extractionResult.domain_data,
      contextSnippet: [
        { role: 'user', text: input.userMessage },
        { role: 'assistant', text: input.assistantMessage },
      ],
    }).catch(e => console.error('[Layer2] unresolved failed:', e));

    // 엔티티 서브 노드 생성 (extractAll 결과 재활용 — 추가 LLM 호출 없음)
    // care 도메인은 subject를 domain_data로 관리하므로 중복 person 엔티티 노드 생성 스킵
    if (extractionResult.entities.length > 0 && domain !== 'care') {
      createEntityNodes(supabase, input.userId!, node.id, extractionResult.entities, extractionResult.relations)
        .catch(e => console.error('[Layer2] entity node creation failed:', e));
    }

    // Layer 3: 임베딩 + 트리플 (비동기, 실패 무시)
    import('./layer3').then(({ embedPendingSentences, extractTriples }) => {
      embedPendingSentences(node.id).catch(e => console.error('[Layer3] embed failed:', e));
      extractTriples(node.id, domain).catch(e => console.error('[Layer3] triple failed:', e));
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
