import type { DomainExtractionConfig } from '../types';

/**
 * journal — 일기/회고/한 일 기록 (Phase 1 4 도메인 중 하나, SSOT §3).
 *
 * emotion과의 차이: emotion은 "감정 상태 자체"의 stealth 도메인(§5)이라
 * 회원이 의식적으로 분류하지 않는다. journal은 회원이 직접 /orb/journal에
 * 적은 공식 일기. 같은 row가 둘 다 만족할 수 있어 mood는 선택 필드로 둔다.
 */
export const config: DomainExtractionConfig = {
  domain: 'journal',
  schema: {
    title: '간단 제목 (15자 이내, 본문 핵심을 한 줄로. 비어 있어도 됨)',
    content: '본문 (원문 그대로 또는 살짝 정리)',
    mood: '슬픔 | 기쁨 | 분노 | 힘듦 | 불안 | 외로움 | 감사 | 우울 | 설렘 | 평온 (감정이 명확히 드러나면)',
    date: 'YYYY-MM-DD (기본: today)',
  },
  requiredFields: ['content'],
  rules: `
- 일기/회고/한 일 기록. "오늘 ~했다", "~다녀왔다", "~먹었다" 등 사건 서술 중심.
- mood: 감정 단어가 명확히 드러나면 추출, 아니면 비워둠. 강제하지 않음.
- title: 본문에서 핵심 행동·장소·인물을 짧게 1줄로 (예: "친구와 카페", "운동 후 컨디션").
- date: 입력 시점(today)이 기본. 본문에 "어제", "지난주 금요일" 등이 있으면 그 시점.
`,
  examples: [
    {
      input: '오늘 컨디션 좋았다',
      output: { title: '좋은 컨디션', content: '오늘 컨디션 좋았다', mood: '기쁨' },
    },
    {
      input: '오랜만에 친구 만나서 카페에 갔다',
      output: { title: '친구와 카페', content: '오랜만에 친구 만나서 카페에 갔다' },
    },
    {
      input: '어제 회의 끝나고 너무 지쳐서 일찍 잤다',
      output: { title: '회의 후 피로', content: '어제 회의 끝나고 너무 지쳐서 일찍 잤다', mood: '힘듦' },
    },
  ],
};
