import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'habit',
  schema: {
    title: '활동/습관 이름',
    completed: 'true | false (완료 여부)',
    duration: '지속 시간 (예: "30분", "1시간")',
    count: '횟수/세트 (예: "3세트", "10km")',
    category: 'exercise | study | diet | wellness | health | other',
    date: 'YYYY-MM-DD (기본: today)',
    note: '추가 메모 (있으면)',
  },
  requiredFields: ['title'],
  rules: `
- category 추론:
  운동/헬스/달리기/수영/요가/배드민턴 → exercise
  공부/독서/강의/학습 → study
  식단/다이어트/채식/절식 → diet
  명상/수면/마음챙김 → wellness
  병원/약/증상/건강검진 → health
  나머지 → other
- completed 판단:
  "했어", "완료", "끝났어", "했다", "달렸어" → true
  "해야 해", "할 예정", "못 했어" → false
  명시 없으면 → true (기록 자체가 수행 의미)
- health 카테고리: 증상(symptoms), 약(medication) 필드 추가 가능
`,
  examples: [
    {
      input: '오늘 30분 달리기했어',
      output: { title: '달리기', completed: true, duration: '30분', category: 'exercise' },
    },
    {
      input: '어제 헬스 3세트 완료',
      output: { title: '헬스', completed: true, count: '3세트', category: 'exercise' },
    },
    {
      input: '오늘 병원 갔다왔어, 두통이 심해서',
      output: { title: '병원 방문', completed: true, category: 'health', note: '두통' },
    },
  ],
};
