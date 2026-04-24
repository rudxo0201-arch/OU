import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'note',
  schema: {
    title: '노트 제목 또는 핵심 주제 (1줄)',
    content: '본문 내용 (원문 최대한 보존)',
    format: 'markdown | plain | list (감지된 포맷)',
    tags: '관련 태그 배열 (3개 이내, 없으면 생략)',
  },
  requiredFields: ['title'],
  rules: `
- title: 입력의 첫 줄이나 핵심 주제로 설정. 명시 없으면 내용 요약으로 생성.
- content: 원문을 최대한 그대로 보존. 요약하지 않는다.
- format: 마크다운 기호(#, -, *) 있으면 markdown, 번호/항목 나열이면 list, 그 외 plain
- 메모, 기록, 정리 요청("~노트 만들어줘", "~기록해줘")이 주된 의도인 경우
`,
  examples: [
    {
      input: '오늘 회의 내용 기록 — 다음 달 런칭 목표, 팀 3명 추가 채용 예정',
      output: { title: '오늘 회의 내용', content: '다음 달 런칭 목표, 팀 3명 추가 채용 예정', format: 'plain', tags: ['회의', '채용'] },
    },
    {
      input: '파스타 레시피\n- 물 끓이기\n- 소금 넣기\n- 면 10분',
      output: { title: '파스타 레시피', content: '- 물 끓이기\n- 소금 넣기\n- 면 10분', format: 'list' },
    },
  ],
};
