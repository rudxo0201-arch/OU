/**
 * 통합 데이터 추출 — extractAll()
 *
 * 정규식 기반 extractDomainData + LLM 기반 extractEntities를 대체.
 * Haiku 1회 호출로 domain_data + entities + relations 모두 추출.
 *
 * 트리플 추출은 Layer 3에서 별도 수행 (품질 최우선).
 */

import { completeWithFallback } from '@/lib/llm/router';
import { getDomainConfig } from './registry';
import { buildExtractionPrompt } from './base-prompt';
import type { ExtractionResult } from './types';

export type { ExtractionResult, ExtractedEntity, ExtractedRelation, DomainExtractionConfig } from './types';

/**
 * 사용자 메시지에서 domain_data + entities + relations 추출
 *
 * @param text 사용자 입력 텍스트
 * @param domain 분류된 도메인 (Sonnet의 json:meta 힌트 또는 classifyDomain 결과)
 * @param today 오늘 날짜 (YYYY-MM-DD) — 상대 날짜 변환 기준
 */
export async function extractAll(
  text: string,
  domain: string,
  today: string,
): Promise<ExtractionResult> {
  try {
    const config = getDomainConfig(domain);
    const now = new Date();
    const currentTime = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' });
    const systemPrompt = buildExtractionPrompt(config, today, currentTime);

    const result = await completeWithFallback(
      [{ role: 'user', content: text }],
      {
        system: systemPrompt,
        maxTokens: 1536,
        operation: 'extract_all',
      },
    );

    return parseExtractionResult(result.text, config.requiredFields ?? []);
  } catch (e) {
    console.error('[Extraction] extractAll failed:', e);
    return {
      domain_data: { title: text.slice(0, 50), content: text },
      entities: [],
      relations: [],
      confidence: 'low',
    };
  }
}

function parseExtractionResult(text: string, requiredFields: string[]): ExtractionResult {
  try {
    // ```json ... ``` 코드블록 제거
    const cleanText = text.replace(/```json?[\s\S]*?```/g, (match) => {
      // 코드블록 안의 내용만 추출
      return match.replace(/```json?\n?/, '').replace(/\n?```/, '');
    }).trim();

    // JSON 객체 추출
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Extraction] No JSON found:', cleanText.slice(0, 200));
      return { domain_data: {}, entities: [], relations: [], confidence: 'low' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const entities = Array.isArray(parsed.entities) ? parsed.entities : [];
    const relations = Array.isArray(parsed.relations) ? parsed.relations : [];

    const clean = (obj: Record<string, any>) =>
      Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''));

    // LLM이 배열로 출력한 경우 — 여러 독립 항목
    if (Array.isArray(parsed.domain_data)) {
      const list = (parsed.domain_data as Record<string, any>[])
        .map(clean)
        .filter(item => requiredFields.every(f => item[f]));

      if (list.length === 0) {
        return { domain_data: {}, entities, relations, confidence: 'low' };
      }
      return {
        domain_data: list[0],
        domain_data_list: list.length > 1 ? list : undefined,
        entities,
        relations,
        confidence: 'high',
      };
    }

    // 단일 객체
    const domain_data = parsed.domain_data && typeof parsed.domain_data === 'object'
      ? parsed.domain_data
      : {};
    const missingRequired = requiredFields.filter(f => !domain_data[f]);
    const confidence = missingRequired.length > 0 ? 'low' : 'high';

    return {
      domain_data: clean(domain_data),
      entities,
      relations,
      confidence,
    };
  } catch (e) {
    console.error('[Extraction] JSON parse failed:', e);
    return { domain_data: {}, entities: [], relations: [], confidence: 'low' };
  }
}
