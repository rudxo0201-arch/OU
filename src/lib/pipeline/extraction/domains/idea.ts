import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'idea',
  schema: {
    title: '아이디어 제목',
    content: '아이디어 내용 요약',
    stage: 'seed | sprout | grow | harvest (개발 단계)',
    related_project: '관련 프로젝트/도메인 (있으면)',
    tags: '관련 키워드 (문자열 배열)',
  },
  requiredFields: ['title'],
  rules: `
- stage 추론:
  "갑자기 생각났는데", "어떨까" → seed
  "계획", "로드맵", "단계별" → sprout
  "만들어보고 있어", "프로토타입" → grow
  "테스트", "검증", "완성" → harvest
- title은 핵심 아이디어를 한 줄로 압축
- content는 핵심 가치/차별점 포함
`,
  examples: [
    {
      input: 'LLM 대화를 자동으로 DB에 구조화하는 개인 데이터 앱 만들면 어떨까',
      output: { title: 'LLM 대화 자동 DB 구조화 앱', content: 'LLM 대화를 자동으로 구조화하여 DB에 저장하는 개인 데이터 플랫폼', stage: 'seed' },
    },
  ],
};
