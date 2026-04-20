import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'knowledge',
  schema: {
    title: '핵심 주제 (첫 줄 or 요약)',
    content: '전체 내용 요약',
    date: 'YYYY-MM-DD (기본: today)',
  },
  rules: `
- title은 첫 줄 또는 핵심 키워드로
- content는 원문 내용 그대로 보존
`,
  examples: [],
};
