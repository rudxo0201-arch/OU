/**
 * 데이터 추출 파이프라인 공통 타입
 *
 * extractAll() 결과: domain_data + entities + relations
 * 트리플 추출은 Layer 3에서 별도 (품질 최우선)
 */

export interface ExtractedEntity {
  name: string;
  type: 'person' | 'location' | 'organization' | 'attribute' | 'object';
  subtype?: string;
  relationship_to_user?: string;
}

export interface ExtractedRelation {
  from: string;
  to: string;
  relation: string;
}

export interface ExtractionResult {
  domain_data: Record<string, any>;
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
  confidence: 'high' | 'medium' | 'low';
}

export interface DomainExtractionConfig {
  domain: string;
  /** 추출할 필드: field → 설명 */
  schema: Record<string, string>;
  /** 필수 필드 — 누락 시 confidence: low */
  requiredFields?: string[];
  /** 도메인별 한국어 추출 규칙 */
  rules: string;
  /** 예시 입력/출력 */
  examples: Array<{ input: string; output: Record<string, any> }>;
}
