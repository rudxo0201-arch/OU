/**
 * 도메인 분류기 — 복합 도메인 지원
 *
 * 1차: 정규식으로 모든 매칭 도메인 수집 (비용 0)
 * 2차: 매칭 없거나 확신도 낮으면 LLM(Haiku) 분류 (비용 최소)
 */

import { completeWithFallback } from '@/lib/llm/router';

const DOMAIN_RULES: Array<{ domain: string; test: (text: string) => boolean }> = [
  {
    domain: 'finance',
    test: (t) => /\d+(원|만원|천원)/.test(t) || /결제|지출|소비|지불|구매|입금|송금|월급|용돈|시급|연봉|적금|투자|주식|배당|이자|대출|임대료|매출|순이익|카드값/.test(t),
  },
  {
    domain: 'emotion',
    test: (t) => /기분|감정|슬프|기쁘|화나|걱정|행복|우울|힘들|짜증|감사|외로|스트레스|불안|설레|뿌듯|허무|답답|속상|서운|그리워|무서|두려|지치|피곤|ㅠㅠ|ㅜㅜ|ㅅㅂ|씨발|좆|망했|죽겠|미치겠/.test(t),
  },
  {
    domain: 'task',
    test: (t) => /해야|할 일|과제|마감|제출|처리|완료|진행|숙제|리포트|준비|끝내|정리해|보내야|확인해|검토/.test(t),
  },
  {
    domain: 'schedule',
    test: (t) => /결혼식|생일|약속|미팅|시험|여행|예약|발인|돌잔치|면접|회식|출장|병원/.test(t)
      || /(\d{1,2}월\s?\d{1,2}일)/.test(t)
      || /(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/.test(t)
      || (/(다음주|이번주|내일|모레|글피|\d+일\s*(후|뒤)|오늘)/.test(t))
      || /\d{1,2}시/.test(t),
  },
  {
    domain: 'education',
    test: (t) => /시험|모의고사|수능|점수|학점|성적|과목|중간고사|기말고사|수학|영어|국어|과학|물리|화학|생물|역사|강의|수업|학원|과외|전공|학교|대학/.test(t),
  },
  {
    domain: 'idea',
    test: (t) => /아이디어|생각|기획|만들면|해보면|어떨까|차려|창업|사업/.test(t),
  },
  {
    domain: 'habit',
    test: (t) => /습관|루틴|매일|꾸준히|반복|챌린지/.test(t),
  },
  {
    domain: 'health',
    test: (t) => /운동|건강|병원|약|진료|다이어트|체중|혈압|두통|감기|아프|통증|무릎|허리|식단|영양/.test(t),
  },
  {
    domain: 'relationship',
    test: (t) => /엄마|아빠|부모|형|누나|동생|언니|오빠|친구|여자친구|남자친구|아내|남편|와이프|사수|후배|선배|선생님|교수|동료/.test(t)
      || /이랑|랑\s*(싸|만|갈|놀)/.test(t),
  },
  {
    domain: 'media',
    test: (t) => /영화|드라마|노래|음악|책|웹툰|유튜브|넷플릭스|게임|팟캐스트|앨범|콘서트/.test(t),
  },
  {
    domain: 'development',
    test: (t) => /코드|함수|컴포넌트|API|버그|에러|빌드|배포|커밋|리팩토링|타입|import|export|npm|pnpm|git|PR|이슈|\.ts|\.tsx|\.js|\.css|\.md|서버|클라이언트|데이터베이스|스키마|마이그레이션|엔드포인트/.test(t),
  },
  {
    domain: 'knowledge',
    test: (t) => /이란|라는|개념|원리|방법|이유|왜냐하면|공부|학습|알려줘|설명|정의|뜻|의미/.test(t),
  },
];

const VIEW_HINT_MAP: Record<string, string> = {
  schedule: 'calendar',
  task: 'task',
  finance: 'chart',
  knowledge: 'knowledge_graph',
  idea: 'mindmap',
  emotion: 'journal',
  habit: 'heatmap',
  health: 'health_dashboard',
  relationship: 'relationship',
  education: 'grade_tracker',
  media: 'scrap',
  development: 'dev_workspace',
};

/**
 * 복합 도메인 분류 — 모든 매칭 도메인 반환
 */
export async function classifyDomain(text: string) {
  // 1차: 정규식 — 모든 매칭 수집
  const matched: string[] = [];
  for (const rule of DOMAIN_RULES) {
    if (rule.test(text)) {
      matched.push(rule.domain);
    }
  }

  // 매칭 없으면 LLM 분류 시도
  if (matched.length === 0) {
    const llmDomains = await classifyWithLLM(text);
    if (llmDomains.length > 0) {
      return {
        domain: llmDomains[0],
        domains: llmDomains,
        viewHint: VIEW_HINT_MAP[llmDomains[0]] ?? null,
        viewHints: llmDomains.map(d => VIEW_HINT_MAP[d]).filter(Boolean),
        confidence: 'medium' as const,
      };
    }
    return {
      domain: 'knowledge',
      domains: ['knowledge'],
      viewHint: 'knowledge_graph',
      viewHints: ['knowledge_graph'],
      confidence: 'low' as const,
    };
  }

  return {
    domain: matched[0],
    domains: matched,
    viewHint: VIEW_HINT_MAP[matched[0]] ?? null,
    viewHints: matched.map(d => VIEW_HINT_MAP[d]).filter(Boolean),
    confidence: matched.length === 1 ? 'high' as const : 'medium' as const,
  };
}

/**
 * LLM 폴백 분류 — 정규식으로 잡히지 않을 때만 호출
 */
async function classifyWithLLM(text: string): Promise<string[]> {
  try {
    const result = await completeWithFallback(
      [{
        role: 'user',
        content: `다음 텍스트를 분류하세요. 해당하는 도메인을 모두 골라 JSON 배열로 반환하세요.

도메인 목록: schedule, finance, emotion, task, education, idea, habit, health, relationship, media, development, knowledge

텍스트: "${text}"

반환 형식: ["domain1", "domain2"]
도메인만 반환하세요. 설명 없이.`,
      }],
      { maxTokens: 100, operation: 'classify_domain' },
    );

    const match = result.text.match(/\[.*\]/);
    if (match) {
      const domains = JSON.parse(match[0]) as string[];
      return domains.filter(d => VIEW_HINT_MAP[d] !== undefined);
    }
  } catch {
    // LLM 실패 시 무시
  }
  return [];
}
