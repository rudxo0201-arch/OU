/**
 * 도메인 분류기 — LLM 기반 복합 도메인 분류
 *
 * 정규식 없음. 모든 분류를 LLM(Haiku)이 수행.
 * 비용 아끼지 않는다.
 */

import { completeWithFallback } from '@/lib/llm/router';

const VIEW_HINT_MAP: Record<string, string> = {
  schedule: 'calendar',
  task: 'task',
  finance: 'chart',
  knowledge: 'knowledge_graph',
  idea: 'mindmap',
  emotion: 'journal',
  habit: 'heatmap',
  relation: 'relation',
  media: 'scrap',
  development: 'dev_workspace',
  note: 'note',
  care: 'care_log',
  // 하위 호환 alias (기존 데이터 대응)
  health: 'heatmap',
  relationship: 'relation',
  education: 'knowledge_graph',
};

const VALID_DOMAINS = Object.keys(VIEW_HINT_MAP);

/**
 * LLM 복합 도메인 분류
 */
export async function classifyDomain(text: string) {
  try {
    const result = await completeWithFallback(
      [{
        role: 'user',
        content: `다음 텍스트에 해당하는 도메인을 모두 골라 JSON 배열로 반환하세요.

도메인 목록:
- schedule: 일정, 약속, 날짜/시간이 포함된 것
- finance: 돈, 금액, 수입/지출, 매출
- emotion: 감정, 기분, 심리 상태
- task: 할 일, 해야 할 것, 마감
- knowledge: 지식, 학습, 정보, 공부 (학업 포함)
- idea: 아이디어, 기획, 구상, 창업
- habit: 습관, 루틴, 반복 행동, 운동, 건강
- relation: 사람 이름이나 관계가 언급된 것 (엄마, 친구, 동료 등)
- media: 영화, 드라마, 음악, 책, 게임
- development: 개발, 코딩, 기술
- note: 노트 작성, 메모, 기록, 글쓰기, 정리 요청 ("~노트 만들어줘", "~메모해줘", "~기록해줘")
- care: 육아/반려동물/노인 돌봄 — 수유, 기저귀, 수면, 투약, 체온, 음식반응, 발달이정표

규칙:
- 해당하는 도메인을 모두 선택 (복수 가능)
- 감정이 포함되어 있으면 반드시 emotion도 포함
- 사람이 언급되면 반드시 relation도 포함
- 최소 1개 이상 선택

텍스트: "${text.slice(0, 2000)}"

JSON 배열만 반환. 설명 없이.
예: ["schedule", "emotion"]`,
      }],
      { maxTokens: 100, operation: 'classify_domain' },
    );

    const match = result.text.match(/\[.*\]/);
    if (match) {
      const domains = (JSON.parse(match[0]) as string[]).filter(d => VALID_DOMAINS.includes(d));
      if (domains.length > 0) {
        return {
          domain: domains[0],
          domains,
          viewHint: VIEW_HINT_MAP[domains[0]] ?? null,
          viewHints: domains.map(d => VIEW_HINT_MAP[d]).filter(Boolean),
          confidence: 'high' as const,
        };
      }
    }
  } catch (e) {
    console.error('[Classifier] LLM failed:', (e as Error).message);
  }

  // LLM 실패 시 기본값
  return {
    domain: 'knowledge',
    domains: ['knowledge'],
    viewHint: 'knowledge_graph',
    viewHints: ['knowledge_graph'],
    confidence: 'low' as const,
  };
}
