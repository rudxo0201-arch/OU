import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'task',
  schema: {
    title: '할 일 제목',
    deadline: 'YYYY-MM-DD (마감일, 있으면)',
    priority: '3 (high) | 2 (medium) | 1 (low) (숫자로 반환)',
    status: 'todo | in_progress | done (기본: todo)',
    assignee: '담당자 (있으면)',
  },
  requiredFields: ['title'],
  rules: `
- title은 구체적 행동 동사 포함: "보고서 작성", "미팅 준비" (O), "보고서" (X)
- "오늘까지", "내일까지" → deadline 절대 날짜로 변환
- "급하다", "빨리", "오늘 안에" → priority: 3
- "언젠가", "나중에" → priority: 1
- 기본 priority: 2
- "완료", "했어", "끝났어" → status: done
`,
  examples: [
    {
      input: '내일까지 보고서 제출해야 해',
      output: { title: '보고서 제출', deadline: 'tomorrow', priority: 3, status: 'todo' },
    },
    {
      input: '리팩터 PR 올려야함',
      output: { title: '리팩터 PR 올리기', priority: 2, status: 'todo' },
    },
  ],
};
