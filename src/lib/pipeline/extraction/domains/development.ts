import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'development',
  schema: {
    title: '작업 제목 (첫 줄 or 핵심 요약)',
    action_type: 'implement | debug | refactor | plan | deploy | test | review | general',
    tech_stack: '사용 기술/라이브러리 (문자열 배열)',
    files_changed: '변경된 파일 (문자열 배열, 있으면)',
    error_type: '에러 종류 (있으면)',
    error_message: '에러 메시지 요약 (있으면)',
    status: 'in_progress | done | blocked',
  },
  requiredFields: ['title'],
  rules: `
- action_type 추론:
  "구현", "추가", "만들었어", "작성" → implement
  "에러", "버그", "안 돼", "디버깅" → debug
  "리팩터", "정리", "개선" → refactor
  "설계", "계획", "아키텍처" → plan
  "배포", "빌드", "빌드 성공" → deploy
  "테스트", "테스팅" → test
  "PR", "코드리뷰" → review
- tech_stack: 소문자 통일. Next.js, React, Supabase, TypeScript, Python 등
- files_changed: 파일 확장자 포함 (.ts, .tsx, .py 등)
`,
  examples: [
    {
      input: 'layer2.ts에서 엔티티 추출 버그 잡았어',
      output: { title: 'layer2.ts 엔티티 추출 버그 수정', action_type: 'debug', tech_stack: ['typescript'], files_changed: ['layer2.ts'], status: 'done' },
    },
    {
      input: 'Next.js 앱 라우터로 대화 저장 API 구현 중',
      output: { title: '대화 저장 API 구현', action_type: 'implement', tech_stack: ['next.js', 'typescript'], status: 'in_progress' },
    },
  ],
};
