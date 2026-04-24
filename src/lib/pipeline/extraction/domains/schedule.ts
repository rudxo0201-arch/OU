import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'schedule',
  schema: {
    date: 'YYYY-MM-DD (필수, 상대 날짜 → 절대 날짜 변환)',
    time: 'HH:mm 24시간제 (없으면 생략)',
    title: '이벤트 전체 제목 (수식어 포함)',
    category: '일정 카테고리 (care / education / work / finance / health / personal 중 해당하면, 없으면 생략)',
    location: '장소 (건물+층수 등 상세하게)',
    endDate: 'YYYY-MM-DD (기간 이벤트일 때)',
    participants: '함께하는 사람들 (문자열 배열)',
    recurrence: '반복 패턴 (매주/매일 등, 없으면 생략)',
  },
  requiredFields: ['date', 'title'],
  rules: `
- date는 반드시 YYYY-MM-DD ISO 형식. "today", "tomorrow", "next_thursday" 같은 문자열 출력 절대 금지.
- 날짜 없으면 오늘(위에 주입된 today) 기준으로 추론하여 ISO 날짜로 변환
- 오전/오후 없이 1~6시면 오후로 추정
- 오전/오후 없이 7~11시인 경우: 현재 시각(위에 주입된 현재 시각)이 이미 그 시간을 지났으면 오후(+12시간)로 추정. 예) 현재 22:00이면 "11시" → 23:00
- category: 아기/육아/수유/기저귀 → care, 학교/수업/강의/학사 → education, 회의/업무/출장 → work, 병원/운동/건강 → health, 결제/송금 → finance. 해당 없으면 생략
- "다음주 월요일", "이번 금요일" → today 기준 절대 날짜(YYYY-MM-DD)로 변환
- title은 완전한 이벤트명으로: "부인과 수업" (O), "수업" (X), "회의" (X → "팀 미팅" 등)
- 수식어+이벤트 형태면 수식어 포함: "부인과 수업", "팀 회식", "어머니 생신"
- location은 최대한 구체적으로: "강남역 2번 출구 카페" (O), "카페" (X)
- participants에서 나/저/우리 제외
- 하나의 이벤트에 세부 활동이 여럿이면 단일 객체로: "3시에 재활, 스트레칭" → title: "재활, 스트레칭"
- 시간대가 다른 별개 이벤트 여러 개면 domain_data를 배열로 출력
`,
  examples: [
    {
      input: '내일 아침 9시 부인과 수업',
      output: { date: '2026-04-25', time: '09:00', title: '부인과 수업' },
    },
    {
      input: '다음주 목요일 팀 회식 강남역 맥주집',
      output: { date: '2026-04-30', title: '팀 회식', location: '강남역 맥주집' },
    },
    {
      input: '3시엔 재활, 4시20분 부터는 신경 시험 남아있어',
      output: [
        { date: '2026-04-24', time: '15:00', title: '재활' },
        { date: '2026-04-24', time: '16:20', title: '신경 시험' },
      ],
    },
    {
      input: '3시에 재활, 스트레칭',
      output: { date: '2026-04-24', time: '15:00', title: '재활, 스트레칭' },
    },
    {
      input: '3일 후 실습',
      output: { date: '2026-04-27', title: '실습' },
    },
  ],
};
