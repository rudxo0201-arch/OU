import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'relation',
  schema: {
    name: '인물 이름 또는 호칭',
    nickname: '별명 또는 닉네임 (있으면)',
    relationship: '나와의 관계 (가족/친구/직장/학교/연인 등)',
    type: 'family | friend | work | school | romantic | other',
    contact: '전화번호 (있으면)',
    email: '이메일 주소 (있으면)',
    address: '주소 또는 사는 곳 (있으면)',
    sns: 'SNS 계정 (인스타그램, 트위터 등, 있으면)',
    birthday: '생일 (있으면, 예: 5월 3일, 1995-05-03)',
    bloodType: '혈액형 (있으면, 예: A형, O형)',
    mbti: 'MBTI 유형 (있으면, 예: ENFP, ISTJ)',
    job: '직업 또는 직책 (있으면)',
    school: '학교 또는 학교/전공 (있으면)',
    organization: '소속 조직/회사/학교 (있으면)',
    hobby: '취미 또는 좋아하는 활동 (있으면)',
    likes: '좋아하는 것들 (있으면)',
    dislikes: '싫어하는 것들 (있으면)',
    image: '프로필 이미지 URL (있으면)',
    memo: '인물 관련 기타 메모 (있으면)',
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
- birthday: "5월 3일", "1995년 5월 3일", "05/03" 등 다양한 형식 허용
- mbti: 대문자 4글자 (ENFP, ISTJ 등)
- likes/dislikes: 배열이 아닌 쉼표 구분 문자열로 저장
`,
  examples: [
    {
      input: '오늘 희민이 생일이야. 걔 MBTI는 ENFP고 커피 엄청 좋아해',
      output: { name: '희민', relationship: '지인', type: 'friend', birthday: '오늘', mbti: 'ENFP', likes: '커피' },
    },
    {
      input: '팀장님한테 보고했어. 이메일은 kim@company.com이야',
      output: { name: '팀장님', relationship: '상사', type: 'work', email: 'kim@company.com' },
    },
    {
      input: '엄마 혈액형이 A형이고 생일이 3월 15일이래',
      output: { name: '엄마', relationship: '어머니', type: 'family', bloodType: 'A형', birthday: '3월 15일' },
    },
  ],
};
