import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'schedule',
  schema: {
    date: 'YYYY-MM-DD (필수, 상대 날짜 → 절대 날짜 변환)',
    time: 'HH:mm 24시간제 (없으면 생략)',
    title: '이벤트 전체 제목 (수식어 포함)',
    location: '장소 (건물+층수 등 상세하게)',
    endDate: 'YYYY-MM-DD (기간 이벤트일 때)',
    participants: '함께하는 사람들 (문자열 배열)',
    recurrence: '반복 패턴 (매주/매일 등, 없으면 생략)',
  },
  requiredFields: ['date', 'title'],
  rules: `
- 날짜 없으면 오늘(today) 기준으로 추론
- 오전/오후 없이 1~6시면 오후로 추정
- "다음주 월요일", "이번 금요일" → today 기준 절대 날짜로 변환
- title은 완전한 이벤트명으로: "부인과 수업" (O), "수업" (X), "회의" (X → "팀 미팅" 등)
- 수식어+이벤트 형태면 수식어 포함: "부인과 수업", "팀 회식", "어머니 생신"
- location은 최대한 구체적으로: "강남역 2번 출구 카페" (O), "카페" (X)
- participants에서 나/저/우리 제외
`,
  examples: [
    {
      input: '내일 아침 9시 부인과 수업',
      output: { date: 'tomorrow', time: '09:00', title: '부인과 수업' },
    },
    {
      input: '다음주 목요일 팀 회식 강남역 맥주집',
      output: { date: 'next_thursday', title: '팀 회식', location: '강남역 맥주집' },
    },
    {
      input: '이번 일요일 6시 조선호텔 민준이 결혼식',
      output: { date: 'this_sunday', time: '18:00', title: '결혼식', location: '조선호텔', participants: ['민준'] },
    },
    {
      input: '3일 후 실습',
      output: { date: '3_days_later', title: '실습' },
    },
  ],
};
