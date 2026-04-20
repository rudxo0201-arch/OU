import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'media',
  schema: {
    title: '작품/콘텐츠 제목',
    media_type: 'movie | drama | book | music | game | podcast | youtube | other',
    creator: '감독/저자/아티스트/채널 (있으면)',
    rating: '1~5 평점 (있으면)',
    review: '간단한 감상 (있으면)',
    status: 'watching | finished | want_to | dropped',
  },
  requiredFields: ['title'],
  rules: `
- media_type 추론:
  영화 → movie
  드라마/시리즈/넷플릭스 → drama
  소설/에세이/자기계발/책 → book
  노래/앨범/아티스트 → music
  게임 → game
  팟캐스트 → podcast
  유튜브/유튜버 → youtube
- status 추론:
  "봤어", "읽었어", "들었어", "완료" → finished
  "보고 있어", "읽고 있어" → watching
  "보고 싶다", "추천받았어" → want_to
  "재미없어서 그만뒀어" → dropped
`,
  examples: [
    {
      input: '오펜하이머 봤어 진짜 좋았어 5점',
      output: { title: '오펜하이머', media_type: 'movie', rating: 5, status: 'finished' },
    },
    {
      input: '사피엔스 읽고 있는데 너무 재밌다',
      output: { title: '사피엔스', media_type: 'book', status: 'watching', review: '재미있음' },
    },
  ],
};
