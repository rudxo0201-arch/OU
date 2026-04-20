import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'finance',
  schema: {
    amount: '총 금액 (숫자, 원 단위)',
    type: 'expense | income (기본: expense)',
    category: '식비 | 교통 | 쇼핑 | 의료 | 주거 | 통신 | 교육 | 여가 | 기타',
    title: '지출/수입 내용 요약',
    items: '세부 항목 배열 [{name, amount, category}] (여러 항목일 때)',
    date: 'YYYY-MM-DD (기본: today)',
    paymentMethod: '결제 수단 (카드/현금/계좌이체 등, 있으면)',
  },
  requiredFields: ['amount', 'category'],
  rules: `
- 금액 파싱: "1만2천원" → 12000, "3.5만원" → 35000, "12,000" → 12000
- 여러 항목이면 items 배열로. amount는 총합.
- 카테고리 추론:
  식사/음식/커피/배달 → 식비
  버스/지하철/택시/주차/기름 → 교통
  옷/쇼핑/아마존 → 쇼핑
  병원/약/치료 → 의료
  월세/관리비/전기세 → 주거
  통신비/핸드폰/인터넷 → 통신
  학원/수강료/교재 → 교육
  영화/게임/헬스장/여행 → 여가
  나머지 → 기타
- "받았어", "수입", "월급", "용돈" → type: income
- title은 구체적으로: "김치찌개 점심" (O), "식비" (X)
`,
  examples: [
    {
      input: '점심 김치찌개 12000원',
      output: { amount: 12000, type: 'expense', category: '식비', title: '김치찌개 점심', items: [{ name: '김치찌개', amount: 12000, category: '식비' }] },
    },
    {
      input: '아이스아메리카노 4500원, 크로플 6000원',
      output: { amount: 10500, type: 'expense', category: '식비', title: '카페', items: [{ name: '아이스아메리카노', amount: 4500, category: '식비' }, { name: '크로플', amount: 6000, category: '식비' }] },
    },
    {
      input: '이번달 월급 280만원',
      output: { amount: 2800000, type: 'income', category: '기타', title: '월급' },
    },
  ],
};
