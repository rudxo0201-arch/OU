import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'relation',
  schema: {
    name: '인물 이름 또는 호칭',
    relationship: '나와의 관계 (가족/친구/직장/학교/연인 등)',
    type: 'family | friend | work | school | romantic | other',
    contact: '연락처 (전화번호/이메일, 있으면)',
    memo: '인물 관련 메모',
    organization: '소속 조직/학교/회사 (있으면)',
  },
  requiredFields: ['name'],
  rules: `
- 한국어 이름: 2~4자 한글 + 호칭 패턴 (예: 민준이, 희민 언니, 팀장님)
- 호칭으로도 인물 인식: 엄마, 아빠, 할머니, 친구, 팀장님 등
- type 추론:
  엄마/아빠/형/누나/동생/할머니/할아버지 → family
  친구/동기/선배/후배 → friend
  팀장/동료/거래처 → work
  학교친구/선생님/교수님 → school
  남자친구/여자친구/배우자 → romantic
- name에 나/저/우리 제외
- 여러 인물이 언급되면 가장 주요한 1명만 (나머지는 entities로)
`,
  examples: [
    {
      input: '오늘 희민이 생일이야',
      output: { name: '희민', relationship: '지인', type: 'friend', memo: '생일' },
    },
    {
      input: '팀장님한테 보고했어',
      output: { name: '팀장님', relationship: '상사', type: 'work' },
    },
  ],
};
