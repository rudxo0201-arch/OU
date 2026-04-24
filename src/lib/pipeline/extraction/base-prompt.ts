import type { DomainExtractionConfig } from './types';

/**
 * 공통 추출 규칙 — 모든 도메인에 적용
 */
const BASE_RULES = `## 공통 추출 규칙
1. 약어/줄임말은 문맥에서 정식 명칭으로 확장 (예: "본3"→"본과3학년", "GDP"→"국내총생산(GDP)")
2. 엔티티 자동 감지 (5종):
   - person: 인물 이름, 호칭(엄마/팀장님 등), 별명
   - location: 장소명, 건물+층수 주소
   - organization: 대학교, 병원, 회사, 학과, 기관
   - attribute: 자격/등급/속성 (학년, 직급, 전문 분야 등)
   - object: 구체적 사물 (음식명, 제품명 등)
3. 사용자와 엔티티의 관계 추론:
   - 학교 언급 → 재학 또는 졸업
   - 회사 언급 → 재직 또는 거래
4. 빈 필드는 반드시 생략 (null/""/"없음" 입력 금지)
5. 나/저/우리는 엔티티에서 제외`;

/**
 * 도메인별 extraction 시스템 프롬프트 생성
 */
export function buildExtractionPrompt(config: DomainExtractionConfig, today: string, currentTime?: string): string {
  const schemaLines = Object.entries(config.schema)
    .map(([field, desc]) => `  ${field}: ${desc}`)
    .join('\n');

  const examplesText = config.examples.length > 0
    ? `\n## 예시\n${config.examples.map(ex =>
        `입력: "${ex.input}"\n출력: ${JSON.stringify(ex.output)}`
      ).join('\n\n')}`
    : '';

  const timeContext = currentTime
    ? `\n## 현재 시각\n${currentTime} (오전/오후 명시 없는 시간의 AM/PM 추론 기준)`
    : '';

  return `${BASE_RULES}

## 오늘 날짜
${today} (상대 날짜 변환 시 이 날짜를 기준으로)${timeContext}

## 추출 도메인: ${config.domain}

## 추출할 필드
\`\`\`
${schemaLines}
\`\`\`

## 도메인 규칙
${config.rules}
${examplesText}

## 출력 형식 (JSON만, 설명 없이)
\`\`\`json
{
  "domain_data": { /* 위 필드 중 해당하는 것만 */ },
  "entities": [
    { "name": "엔티티명", "type": "person|location|organization|attribute|object", "subtype": "선택", "relationship_to_user": "선택" }
  ],
  "relations": [
    { "from": "주체", "to": "대상", "relation": "관계설명" }
  ]
}
\`\`\`

**여러 개의 독립적인 항목이 있을 때:** domain_data를 배열로 출력.
\`\`\`json
{
  "domain_data": [
    { /* 첫 번째 항목 */ },
    { /* 두 번째 항목 */ }
  ],
  "entities": [],
  "relations": []
}
\`\`\`

entities, relations가 없으면 빈 배열 [].`;
}
