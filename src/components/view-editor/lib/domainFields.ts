export const DOMAIN_FIELDS: Record<string, { key: string; label: string }[]> = {
  task:     [{ key: 'status', label: '상태' }, { key: 'priority', label: '우선순위' }, { key: 'due', label: '마감일' }, { key: 'tag', label: '태그' }],
  schedule: [{ key: 'date', label: '날짜' }, { key: 'time', label: '시간' }, { key: 'place', label: '장소' }],
  finance:  [{ key: 'date', label: '날짜' }, { key: 'category', label: '분류' }, { key: 'amount', label: '금액' }],
  habit:    [{ key: 'date', label: '날짜' }, { key: 'habit', label: '습관' }, { key: 'streak', label: '연속' }],
  emotion:  [{ key: 'date', label: '날짜' }, { key: 'valence', label: '감정' }, { key: 'tag', label: '태그' }],
  knowledge:[{ key: 'date', label: '날짜' }, { key: 'topic', label: '주제' }, { key: 'tag', label: '태그' }],
};
