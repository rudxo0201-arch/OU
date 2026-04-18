// 도메인 분류 — 순서 중요: 구체적인 패턴이 먼저
const DOMAIN_RULES: Array<{ domain: string; test: (text: string) => boolean }> = [
  // finance: 금액이 있으면 최우선
  {
    domain: 'finance',
    test: (t) => /\d+(원|만원|천원)/.test(t) || /결제|지출|소비|지불|구매|입금|송금/.test(t),
  },
  // emotion: 감정 표현
  {
    domain: 'emotion',
    test: (t) => /기분|감정|슬프|기쁘|화나|걱정|행복|우울|힘들|짜증|감사|외로/.test(t),
  },
  // task: 할 일
  {
    domain: 'task',
    test: (t) => /해야|할 일|과제|마감|제출|처리|완료|진행|숙제|리포트/.test(t),
  },
  // schedule: 일정 (금액 없을 때만)
  {
    domain: 'schedule',
    test: (t) => /결혼식|생일|약속|미팅|시험|고사|여행|예약|발인|돌잔치/.test(t)
      || /(\d{1,2}월\s?\d{1,2}일)/.test(t)
      || /(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/.test(t)
      || (/(다음주|이번주|내일|모레|글피|\d+일\s*(후|뒤)|오늘)/.test(t) && !/\d+(원|만원)/.test(t))
      || /\d{1,2}시/.test(t),
  },
  // idea
  {
    domain: 'idea',
    test: (t) => /아이디어|생각|기획|만들면|해보면|어떨까|프로젝트/.test(t),
  },
  // habit
  {
    domain: 'habit',
    test: (t) => /운동|습관|루틴|매일|꾸준히/.test(t),
  },
  // development: 개발/코딩 관련
  {
    domain: 'development',
    test: (t) => /코드|함수|컴포넌트|API|버그|에러|빌드|배포|커밋|리팩토링|타입|import|export|npm|pnpm|git|PR|이슈|\.ts|\.tsx|\.js|\.css|\.md|서버|클라이언트|데이터베이스|스키마|마이그레이션|엔드포인트/.test(t),
  },
  // knowledge: 가장 넓은 범위 (기본값에 가까움)
  {
    domain: 'knowledge',
    test: (t) => /이란|라는|개념|원리|방법|이유|왜냐하면|공부|학습/.test(t),
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
  relation: 'relationship',
  development: 'dev_workspace',
};

export async function classifyDomain(text: string) {
  for (const rule of DOMAIN_RULES) {
    if (rule.test(text)) {
      return {
        domain: rule.domain,
        viewHint: VIEW_HINT_MAP[rule.domain] ?? null,
        confidence: 'medium' as const,
      };
    }
  }
  return { domain: 'knowledge', viewHint: 'knowledge_graph', confidence: 'low' as const };
}
