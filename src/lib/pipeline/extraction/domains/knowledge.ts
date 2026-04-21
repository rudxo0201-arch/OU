import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'knowledge',
  schema: {
    title: '핵심 주제 또는 개념명',
    content: '핵심 내용 요약 (1~3문장)',
    key_points: '주요 포인트 배열 (문자열 3~7개). 입력이 3문장 이상이고 구조화된 설명이 있을 때만 추출. 없으면 생략.',
    topic: '상위 분야/주제 (예: 경제학, 한의학, 역사)',
    subtype: 'academic | general | professional (학업 맥락이면 academic)',
    source: '출처 또는 학습 경로 (있으면)',
    concepts: '언급된 핵심 개념들 (문자열 배열)',
  },
  requiredFields: ['title'],
  rules: `
- 약어/줄임말은 문맥에서 정식 명칭으로 확장:
  "본3", "본과3" → "본과3학년" (한의대 본과 3학년)
  "예과1", "예1" → "예과1학년"
  "GDP" → "국내총생산(GDP)"으로 확장하되 원어 병기
- subtype 판단:
  학교 수업/시험/과제 맥락 → academic
  직업/업무 관련 지식 → professional
  일반 정보/상식 → general
- concepts: 입력에서 핵심 명사/개념어 추출 (3~7개)
- 학습 내용이면 topic 필수
`,
  examples: [
    {
      input: 'GDP란 한 나라 안에서 생산된 모든 재화와 서비스의 총 시장가치야',
      output: { title: 'GDP(국내총생산)', content: '한 나라 안에서 생산된 모든 재화와 서비스의 총 시장가치', topic: '경제학', subtype: 'general', concepts: ['GDP', '재화', '서비스', '시장가치'] },
    },
    {
      input: '본3 부인과 수업에서 자궁경부암 스테이징 배웠어',
      output: { title: '자궁경부암 스테이징', topic: '부인과학', subtype: 'academic', concepts: ['자궁경부암', '스테이징', '부인과'] },
    },
  ],
};
