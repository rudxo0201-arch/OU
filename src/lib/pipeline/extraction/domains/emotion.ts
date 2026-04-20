import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'emotion',
  schema: {
    mood: '슬픔 | 기쁨 | 분노 | 힘듦 | 불안 | 외로움 | 감사 | 우울 | 설렘 | 평온',
    intensity: '1~5 (감정 강도, 기본: 3)',
    trigger: '감정을 유발한 원인/상황 (있으면)',
    content: '원문 내용 요약',
    date: 'YYYY-MM-DD (기본: today)',
  },
  requiredFields: ['mood'],
  rules: `
- mood 추론 (대표 키워드):
  슬픔: 슬프다, 눈물, 울었다, 그립다
  기쁨: 기쁘다, 좋다, 행복하다, 즐거웠다, 최고
  분노: 화났다, 짜증났다, 열받다, 억울하다
  힘듦: 힘들다, 지쳤다, 피곤하다, 버겁다, 무기력
  불안: 불안하다, 걱정된다, 두렵다, 초조하다
  외로움: 외롭다, 혼자다, 쓸쓸하다
  감사: 감사하다, 고맙다, 다행이다
  우울: 우울하다, 무기력하다, 의미없다, 공허하다
  설렘: 설레다, 두근두근, 기대된다
  평온: 괜찮다, 무난하다, 담담하다
- intensity:
  "너무", "정말 많이", "죽을 것 같다" → 5
  "조금", "살짝" → 2
  명시 없으면 → 3
- trigger: 원인이 명확하면 반드시 추출
`,
  examples: [
    {
      input: '요즘 학교에서 스트레스 너무 받아서 너무 힘들어',
      output: { mood: '힘듦', intensity: 4, trigger: '학교 스트레스', content: '학교 스트레스로 힘든 상태' },
    },
    {
      input: '오늘 발표 잘 됐어! 너무 기뻐',
      output: { mood: '기쁨', intensity: 4, trigger: '발표 성공', content: '발표가 잘 되어 기쁨' },
    },
  ],
};
