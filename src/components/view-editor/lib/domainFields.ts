export const DOMAIN_FIELDS: Record<string, { key: string; label: string }[]> = {
  task:      [{ key: 'status', label: '상태' }, { key: 'priority', label: '우선순위' }, { key: 'due', label: '마감일' }, { key: 'tag', label: '태그' }],
  schedule:  [{ key: 'date', label: '날짜' }, { key: 'time', label: '시간' }, { key: 'place', label: '장소' }],
  finance:   [{ key: 'date', label: '날짜' }, { key: 'category', label: '분류' }, { key: 'amount', label: '금액' }],
  habit:     [{ key: 'date', label: '날짜' }, { key: 'habit', label: '습관' }, { key: 'streak', label: '연속' }],
  emotion:   [{ key: 'date', label: '날짜' }, { key: 'valence', label: '감정' }, { key: 'tag', label: '태그' }],
  knowledge: [{ key: 'date', label: '날짜' }, { key: 'topic', label: '주제' }, { key: 'tag', label: '태그' }],
  boncho:    [{ key: 'name', label: '이름' }, { key: 'property', label: '성미' }, { key: 'meridian', label: '귀경' }, { key: 'effect', label: '효능' }],
  hanja:     [{ key: 'character', label: '한자' }, { key: 'meaning', label: '뜻' }, { key: 'radical', label: '부수' }, { key: 'stroke', label: '획수' }],
  bangje:    [{ key: 'name', label: '이름' }, { key: 'ingredient', label: '구성' }, { key: 'indication', label: '적응증' }, { key: 'effect', label: '효능' }],
  idea:      [{ key: 'category', label: '분류' }, { key: 'tag', label: '태그' }, { key: 'date', label: '날짜' }],
  media:     [{ key: 'type', label: '유형' }, { key: 'creator', label: '제작자' }, { key: 'date', label: '날짜' }, { key: 'tag', label: '태그' }],
  education: [{ key: 'subject', label: '과목' }, { key: 'topic', label: '주제' }, { key: 'level', label: '수준' }, { key: 'date', label: '날짜' }],
};
