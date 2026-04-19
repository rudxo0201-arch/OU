/**
 * test-scenarios.ts
 *
 * Orb 파이프라인 시뮬레이션 테스트
 * - classifyDomain() + extractDomainData() 호출 (비용 0, 정규식 기반)
 * - 20명 페르소나, 각 5~8턴 대화
 * - 결과를 OU 디자인 시스템 기반 HTML 리포트로 출력
 *
 * Usage: npx tsx scripts/test-scenarios.ts
 */

import { classifyDomain } from '../src/lib/pipeline/classifier';
import { extractDomainData } from '../src/lib/pipeline/extract-domain-data';
import fs from 'fs';
import path from 'path';

// ─── Types ───

interface Turn {
  message: string;
  expected: {
    domain: string;
    viewHint: string;
    keyFields?: Record<string, any>;
  };
  isContextRecall?: boolean;
}

interface Persona {
  id: number;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  group: string;
  description: string;
  turns: Turn[];
}

interface TurnResult {
  message: string;
  expected: Turn['expected'];
  actual: {
    domain: string;
    viewHint: string | null;
    confidence: string;
    domainData: Record<string, any>;
  };
  domainMatch: boolean;
  viewHintMatch: boolean;
  keyFieldMatches: Record<string, boolean>;
  isContextRecall: boolean;
}

interface PersonaResult {
  persona: Persona;
  turns: TurnResult[];
  accuracy: {
    domain: number;
    viewHint: number;
    overall: number;
  };
}

// ─── Persona Definitions (20 personas) ───

const personas: Persona[] = [
  // === 10대 ===
  {
    id: 1,
    name: '김수연',
    age: 17,
    gender: '여',
    occupation: '고등학생',
    group: '10대',
    description: '수능 준비 중. 수학이 약점. 친구들과 놀러 다니는 걸 좋아함.',
    turns: [
      {
        message: '수학 모의고사 망했어 ㅠㅠ 62점',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '내일 학원 3시 반에 가야 해',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '15:30' },
        },
      },
      {
        message: '엄마가 용돈 5만원 줬다',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 50000 },
        },
      },
      {
        message: '수지랑 토요일에 홍대 가기로 함',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
      {
        message: '아 진짜 수학 포기하고 싶다 힘들어',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '지난번 모의고사 몇 점이었지?',
        expected: { domain: 'knowledge', viewHint: 'knowledge_graph' },
        isContextRecall: true,
      },
    ],
  },
  {
    id: 2,
    name: '박준호',
    age: 18,
    gender: '남',
    occupation: '고등학생',
    group: '10대',
    description: '게임 좋아하고 진로 고민 중. 체육대회 준비.',
    turns: [
      {
        message: '오늘 롤 5판 했는데 3승 2패',
        expected: { domain: 'knowledge', viewHint: 'knowledge_graph' },
      },
      {
        message: '진로 상담 다음주 화요일에 있어',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
      {
        message: '야자 빠지고 싶다 짜증나',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '체육대회 다음주 금요일이다',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
      {
        message: '게임 아이템 12000원 결제함',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 12000 },
        },
      },
      {
        message: '대학 갈까 취업할까 고민이야',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
    ],
  },

  // === 20대 ===
  {
    id: 3,
    name: '이지은',
    age: 21,
    gender: '여',
    occupation: '대학생 (문과)',
    group: '20대',
    description: '국문과 3학년. 동아리 활동 활발. 카페 알바.',
    turns: [
      {
        message: '레포트 마감이 금요일인데 아직 시작도 못 했어',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: '동아리 회식 이번주 토요일 저녁 7시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '19:00' },
        },
      },
      {
        message: '남자친구랑 기념일인데 뭘 해야 할지 모르겠어',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '카페 알바 시급 만원으로 올랐다',
        expected: { domain: 'finance', viewHint: 'chart' },
      },
      {
        message: '교수님이 과제 피드백 줬는데 다 고치래',
        expected: { domain: 'task', viewHint: 'task' },
      },
    ],
  },
  {
    id: 4,
    name: '정민수',
    age: 23,
    gender: '남',
    occupation: '대학생 (공대)',
    group: '20대',
    description: '컴공과. 코딩 프로젝트 진행 중. 자격증 준비.',
    turns: [
      {
        message: 'React 프로젝트에서 TypeError 에러 나서 3시간째 디버깅 중',
        expected: {
          domain: 'development',
          viewHint: 'dev_workspace',
          keyFields: { action_type: 'debug', error_type: 'TypeError' },
        },
      },
      {
        message: '정보처리기사 시험 5월 20일이다',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
      {
        message: '취준 스터디 만들면 어떨까',
        expected: { domain: 'idea', viewHint: 'mindmap' },
      },
      {
        message: '코딩 테스트 과제 제출해야 해',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: 'next.js 배포 vercel로 해봤는데 빌드 에러남',
        expected: {
          domain: 'development',
          viewHint: 'dev_workspace',
          keyFields: { action_type: 'deploy' },
        },
      },
      {
        message: '알고리즘 공부 매일 2문제씩 풀기로 했어',
        expected: { domain: 'habit', viewHint: 'heatmap' },
      },
    ],
  },
  {
    id: 5,
    name: '한소영',
    age: 22,
    gender: '여',
    occupation: '대학생 (의대)',
    group: '20대',
    description: '의대 본과 2학년. 해부학 시험 준비. 병원 실습.',
    turns: [
      {
        message: '해부학 시험 다음주 수요일 오전 9시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '09:00' },
        },
      },
      {
        message: '병원 실습 매일 6시간씩 너무 힘들어',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '해부학이란 인체 구조를 연구하는 학문이다',
        expected: { domain: 'knowledge', viewHint: 'knowledge_graph' },
      },
      {
        message: '스터디 교재비 3만원 결제',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 30000 },
        },
      },
      {
        message: '의학 용어 암기 매일 30개씩 꾸준히 하기',
        expected: { domain: 'habit', viewHint: 'heatmap' },
      },
    ],
  },
  {
    id: 6,
    name: '최유진',
    age: 25,
    gender: '여',
    occupation: '사회초년생',
    group: '20대',
    description: '마케팅 직군. 첫 직장. 자취 시작.',
    turns: [
      {
        message: '첫 월급 280만원 들어왔다',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 2800000 },
        },
      },
      {
        message: '자취방 월세 50만원 이체해야 해',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 500000, category: '주거' },
        },
      },
      {
        message: '적금 매달 50만원 넣기로 했어',
        expected: { domain: 'finance', viewHint: 'chart' },
      },
      {
        message: '회사 적응하느라 힘들다 걱정돼',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '팀장님이 보고서 제출하래 마감 내일',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: '점심 김밥 4천원, 커피 5천원',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 9000 },
        },
      },
    ],
  },
  {
    id: 7,
    name: '오태현',
    age: 27,
    gender: '남',
    occupation: '사회초년생',
    group: '20대',
    description: '개발자. 이직 준비 중. 운동 루틴.',
    turns: [
      {
        message: '이직하고 싶다 야근 너무 많아 힘들어',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '헬스 매일 1시간씩 운동 했어',
        expected: {
          domain: 'habit',
          viewHint: 'heatmap',
          keyFields: { title: '헬스', duration: '1시간' },
        },
      },
      {
        message: '주식 삼성전자 10주 매수 85만원',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 850000 },
        },
      },
      {
        message: '면접 다음주 목요일 오후 2시 강남역',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '14:00' },
        },
      },
      {
        message: 'TypeScript 리팩토링 중인데 컴포넌트 구조가 꼬였다',
        expected: {
          domain: 'development',
          viewHint: 'dev_workspace',
          keyFields: { action_type: 'refactor' },
        },
      },
    ],
  },

  // === 30대 ===
  {
    id: 8,
    name: '김서연',
    age: 32,
    gender: '여',
    occupation: '직장인 (워킹맘)',
    group: '30대',
    description: '마케팅 팀. 아이 2살. 육아와 직장 병행.',
    turns: [
      {
        message: '이유식 재료비 3만원 마트에서 결제',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 30000 },
        },
      },
      {
        message: '어린이집 면담 금요일 오후 4시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '16:00' },
        },
      },
      {
        message: '육아하면서 일하는 게 너무 힘들다',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '아이 예방접종 다음주 월요일 병원 예약',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
      {
        message: '회의 자료 제출 마감 수요일',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: '아이 돌잔치 준비해야 해',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
    ],
  },
  {
    id: 9,
    name: '이동훈',
    age: 34,
    gender: '남',
    occupation: '직장인 (팀장)',
    group: '30대',
    description: 'IT 회사 팀장. 프로젝트 관리. 투자에 관심.',
    turns: [
      {
        message: '프로젝트 마감 3주 남았는데 진행이 느려',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: '팀원 면담 내일 오후 3시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '15:00' },
        },
      },
      {
        message: 'ETF 투자 매달 100만원 적립식으로',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 1000000 },
        },
      },
      {
        message: '부서 예산 계획서 작성해야 해',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: '신규 입사자 온보딩 프로젝트 기획해보면',
        expected: { domain: 'idea', viewHint: 'mindmap' },
      },
    ],
  },
  {
    id: 10,
    name: '강현우',
    age: 31,
    gender: '남',
    occupation: '프리랜서 디자이너',
    group: '30대',
    description: 'UI/UX 디자이너. 클라이언트 여럿. 세금 신고 걱정.',
    turns: [
      {
        message: '클라이언트 미팅 화요일 2시 강남카페',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '14:00' },
        },
      },
      {
        message: '종합소득세 신고 마감이 5월 31일',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
      {
        message: '포트폴리오 사이트 만들면 어떨까',
        expected: { domain: 'idea', viewHint: 'mindmap' },
      },
      {
        message: '디자인 외주비 300만원 입금',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 3000000 },
        },
      },
      {
        message: '피그마 파일 정리하는 게 과제야',
        expected: { domain: 'task', viewHint: 'task' },
      },
    ],
  },
  {
    id: 11,
    name: '박민지',
    age: 36,
    gender: '여',
    occupation: '자영업자 (카페)',
    group: '30대',
    description: '카페 사장. 매출 관리. 신메뉴 개발.',
    turns: [
      {
        message: '오늘 매출 48만원 괜찮네',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 480000 },
        },
      },
      {
        message: '재료비 커피 원두 15만원 결제',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 150000 },
        },
      },
      {
        message: '알바생 면접 토요일 11시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '11:00' },
        },
      },
      {
        message: '신메뉴 딸기라떼 만들면 어떨까',
        expected: { domain: 'idea', viewHint: 'mindmap' },
      },
      {
        message: '매달 임대료 150만원 부담된다',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 1500000 },
        },
      },
      {
        message: '카페 인테리어 바꾸는 거 기획해보면',
        expected: { domain: 'idea', viewHint: 'mindmap' },
      },
    ],
  },

  // === 40대 ===
  {
    id: 12,
    name: '송재혁',
    age: 43,
    gender: '남',
    occupation: '중간관리자',
    group: '40대',
    description: '대기업 부장. 임원 보고. 골프 좋아함.',
    turns: [
      {
        message: '임원 보고 수요일 오전 10시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '10:00' },
        },
      },
      {
        message: '부서 예산 2억 3천만원 확보해야 해',
        expected: { domain: 'finance', viewHint: 'chart' },
      },
      {
        message: '골프 라운딩 이번주 일요일 새벽 6시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '06:00' },
        },
      },
      {
        message: '팀원들 성과 평가 리포트 제출해야 해',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: '스트레스 받는다 회사 정치가 힘들어',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
    ],
  },
  {
    id: 13,
    name: '윤지혜',
    age: 41,
    gender: '여',
    occupation: '워킹맘',
    group: '40대',
    description: '회계팀. 초등학생 아이. 건강 관리 시작.',
    turns: [
      {
        message: '학부모 모임 목요일 저녁 6시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '18:00' },
        },
      },
      {
        message: '아이 수학 학원비 35만원 결제',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 350000, category: '교육' },
        },
      },
      {
        message: '건강검진 예약 다음주 월요일 병원',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
      {
        message: '요가 매일 30분 꾸준히 하기로',
        expected: {
          domain: 'habit',
          viewHint: 'heatmap',
          keyFields: { title: '요가' },
        },
      },
      {
        message: '아이 방학 체험학습 프로그램 알아봐야 해',
        expected: { domain: 'task', viewHint: 'task' },
      },
    ],
  },
  {
    id: 14,
    name: '장성호',
    age: 45,
    gender: '남',
    occupation: '1인 사업자 (쇼핑몰)',
    group: '40대',
    description: '의류 쇼핑몰 운영. 택배/CS/광고 관리.',
    turns: [
      {
        message: '오늘 택배 120건 발송, 매출 380만원',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 3800000 },
        },
      },
      {
        message: 'CS 불만 전화 5건 처리해야 해',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: '네이버 광고비 50만원 결제',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 500000 },
        },
      },
      {
        message: '신상품 촬영 다음주 화요일',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
      {
        message: '인스타 마케팅 전략 만들면 어떨까',
        expected: { domain: 'idea', viewHint: 'mindmap' },
      },
      {
        message: '재고 관리 시스템 도입 기획해보면',
        expected: { domain: 'idea', viewHint: 'mindmap' },
      },
    ],
  },

  // === 50대+ ===
  {
    id: 15,
    name: '한상철',
    age: 52,
    gender: '남',
    occupation: '자영업자 (식당)',
    group: '50대+',
    description: '한식당 운영 15년. 배달앱 등록. 직원 관리.',
    turns: [
      {
        message: '이번 달 매출 1200만원인데 작년보다 떨어졌어',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 12000000 },
        },
      },
      {
        message: '배달앱 수수료가 너무 높아 걱정이야',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '직원 면접 금요일 오후 1시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '13:00' },
        },
      },
      {
        message: '식재료 도매시장 장보기 50만원',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 500000 },
        },
      },
      {
        message: '메뉴 리뉴얼 기획해보면 좋겠다',
        expected: { domain: 'idea', viewHint: 'mindmap' },
      },
    ],
  },
  {
    id: 16,
    name: '정미숙',
    age: 55,
    gender: '여',
    occupation: '주부',
    group: '50대+',
    description: '자녀 결혼 준비 중. 건강 관리. 요리 취미.',
    turns: [
      {
        message: '딸 결혼식 10월 15일이야',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
      {
        message: '건강검진 결과 나왔는데 걱정된다',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '제주도 여행 예약 비행기표 25만원',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 250000 },
        },
      },
      {
        message: '요리 클래스 매주 수요일 오전 10시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '10:00' },
        },
      },
      {
        message: '산책 매일 30분 꾸준히 해야지',
        expected: {
          domain: 'habit',
          viewHint: 'heatmap',
          keyFields: { title: '산책' },
        },
      },
    ],
  },
  {
    id: 17,
    name: '이정수',
    age: 58,
    gender: '남',
    occupation: '은퇴 준비',
    group: '50대+',
    description: '정년퇴직 2년 남음. 연금/노후 준비. 손주.',
    turns: [
      {
        message: '국민연금 월 120만원 나온다고 하더라',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 1200000 },
        },
      },
      {
        message: '노후 생활비 계획을 세워야 해',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: '손주 돌잔치 6월 8일',
        expected: { domain: 'schedule', viewHint: 'calendar' },
      },
      {
        message: '등산 매주 토요일 꾸준히 다니고 있어',
        expected: {
          domain: 'habit',
          viewHint: 'heatmap',
          keyFields: { title: '등산' },
        },
      },
      {
        message: '은퇴 후에 뭐 하면서 살지 걱정이야',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '서예 배우기 시작했는데 재밌어',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
    ],
  },

  // === 특수 ===
  {
    id: 18,
    name: '안세희',
    age: 22,
    gender: '여',
    occupation: '유학생',
    group: '특수',
    description: '미국 유학 중. 영어+한국어 섞어 씀. 환율 민감.',
    turns: [
      {
        message: '환율 1350원이라 송금 200만원 보냈어',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 2000000 },
        },
      },
      {
        message: 'midterm exam 다음주 월요일인데 걱정돼',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '한국 음식이 그리워 김치찌개 해먹었어',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
      {
        message: '렌트비 $1200 내야 해 한국 돈으로 162만원',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 1620000 },
        },
      },
      {
        message: '여름 방학 한국 가는 비행기표 120만원',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 1200000 },
        },
      },
    ],
  },
  {
    id: 19,
    name: '김도윤',
    age: 28,
    gender: '남',
    occupation: '크리에이터',
    group: '특수',
    description: '유튜브 구독자 5만. 영상 편집. 수익화.',
    turns: [
      {
        message: '이번 달 유튜브 수익 230만원 들어왔다',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 2300000 },
        },
      },
      {
        message: '다음 영상 콘텐츠 기획 아이디어 정리해볼까',
        expected: { domain: 'idea', viewHint: 'mindmap' },
      },
      {
        message: '영상 편집 마감 내일까지 해야 돼',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: '촬영 장비 카메라 250만원 결제',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 2500000 },
        },
      },
      {
        message: '매일 쇼츠 1개씩 올리기 꾸준히 해야지',
        expected: { domain: 'habit', viewHint: 'heatmap' },
      },
      {
        message: '협찬 미팅 다음주 수요일 3시 홍대카페',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '15:00' },
        },
      },
    ],
  },
  {
    id: 20,
    name: '배철수',
    age: 48,
    gender: '남',
    occupation: '소상공인',
    group: '특수',
    description: '편의점 2개 운영. 대출 상환. 직원 관리.',
    turns: [
      {
        message: '대출 이자 매달 85만원 나간다',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 850000 },
        },
      },
      {
        message: '임대료 월 200만원인데 올려달래',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 2000000 },
        },
      },
      {
        message: '직원 2명 새로 뽑아야 해',
        expected: { domain: 'task', viewHint: 'task' },
      },
      {
        message: '이번 달 매출 2300만원 저번 달보다 좋다',
        expected: {
          domain: 'finance',
          viewHint: 'chart',
          keyFields: { amount: 23000000 },
        },
      },
      {
        message: '세무사 미팅 금요일 오후 2시',
        expected: {
          domain: 'schedule',
          viewHint: 'calendar',
          keyFields: { time: '14:00' },
        },
      },
      {
        message: '사업 확장하고 싶은데 걱정이 많아',
        expected: { domain: 'emotion', viewHint: 'journal' },
      },
    ],
  },
];

// ─── Test Runner ───

async function runTests(): Promise<PersonaResult[]> {
  const results: PersonaResult[] = [];

  for (const persona of personas) {
    const turnResults: TurnResult[] = [];

    for (const turn of persona.turns) {
      const classification = await classifyDomain(turn.message);
      const domainData = extractDomainData(turn.message, classification.domain);

      const domainMatch = classification.domain === turn.expected.domain;
      const viewHintMatch = classification.viewHint === turn.expected.viewHint;

      const keyFieldMatches: Record<string, boolean> = {};
      if (turn.expected.keyFields) {
        for (const [key, expectedVal] of Object.entries(turn.expected.keyFields)) {
          keyFieldMatches[key] = domainData[key] === expectedVal;
        }
      }

      turnResults.push({
        message: turn.message,
        expected: turn.expected,
        actual: {
          domain: classification.domain,
          viewHint: classification.viewHint,
          confidence: classification.confidence,
          domainData,
        },
        domainMatch,
        viewHintMatch,
        keyFieldMatches,
        isContextRecall: turn.isContextRecall ?? false,
      });
    }

    const domainCorrect = turnResults.filter((t) => t.domainMatch).length;
    const viewHintCorrect = turnResults.filter((t) => t.viewHintMatch).length;
    const total = turnResults.length;

    results.push({
      persona,
      turns: turnResults,
      accuracy: {
        domain: Math.round((domainCorrect / total) * 100),
        viewHint: Math.round((viewHintCorrect / total) * 100),
        overall: Math.round(((domainCorrect + viewHintCorrect) / (total * 2)) * 100),
      },
    });
  }

  return results;
}

// ─── HTML Report Generator ───

function generateHTML(results: PersonaResult[]): string {
  const totalTurns = results.reduce((s, r) => s + r.turns.length, 0);
  const domainCorrect = results.reduce(
    (s, r) => s + r.turns.filter((t) => t.domainMatch).length,
    0,
  );
  const viewHintCorrect = results.reduce(
    (s, r) => s + r.turns.filter((t) => t.viewHintMatch).length,
    0,
  );
  const keyFieldTotal = results.reduce(
    (s, r) => s + r.turns.reduce((ts, t) => ts + Object.keys(t.keyFieldMatches).length, 0),
    0,
  );
  const keyFieldCorrect = results.reduce(
    (s, r) =>
      s +
      r.turns.reduce(
        (ts, t) => ts + Object.values(t.keyFieldMatches).filter(Boolean).length,
        0,
      ),
    0,
  );

  // Domain breakdown
  const domainStats: Record<string, { total: number; correct: number }> = {};
  for (const r of results) {
    for (const t of r.turns) {
      const d = t.expected.domain;
      if (!domainStats[d]) domainStats[d] = { total: 0, correct: 0 };
      domainStats[d].total++;
      if (t.domainMatch) domainStats[d].correct++;
    }
  }

  // Group personas
  const groups: Record<string, PersonaResult[]> = {};
  for (const r of results) {
    const g = r.persona.group;
    if (!groups[g]) groups[g] = [];
    groups[g].push(r);
  }

  const viewHintEmoji: Record<string, string> = {
    calendar: '&#128197;',
    task: '&#9745;',
    chart: '&#128202;',
    knowledge_graph: '&#128218;',
    mindmap: '&#128161;',
    journal: '&#128214;',
    heatmap: '&#128293;',
    relationship: '&#128101;',
    dev_workspace: '&#128187;',
  };

  const domainColor: Record<string, string> = {
    finance: '#e8976b',
    schedule: '#6b9fe8',
    emotion: '#c76be8',
    task: '#6be89e',
    idea: '#e8d46b',
    habit: '#6be8d4',
    knowledge: '#9e9e9e',
    development: '#8b6be8',
    relation: '#e86b8b',
  };

  function renderPersonaCard(r: PersonaResult): string {
    const turnsHtml = r.turns
      .map((t, idx) => {
        const domainBadgeBg = t.domainMatch ? 'var(--ou-bg)' : 'var(--ou-accent)';
        const domainBadgeStyle = t.domainMatch
          ? 'box-shadow: var(--ou-neu-pressed-sm);'
          : `background: var(--ou-accent); color: white; box-shadow: none;`;

        const extractedFields = Object.entries(t.actual.domainData)
          .filter(([k]) => !['date', 'content', 'memo'].includes(k))
          .map(([k, v]) => {
            const expected = t.expected.keyFields?.[k];
            const match = expected !== undefined ? t.keyFieldMatches[k] : undefined;
            const matchIcon =
              match === true ? '&#10003;' : match === false ? '&#10007;' : '';
            const matchStyle =
              match === false ? 'color: var(--ou-accent); font-weight: 600;' : '';
            const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return `<span class="field-tag" style="${matchStyle}">${k}: ${valStr} ${matchIcon}</span>`;
          })
          .join('');

        return `
        <div class="turn">
          <div class="turn-header">
            <span class="turn-number">Turn ${idx + 1}</span>
            ${t.isContextRecall ? '<span class="context-badge">Context Recall</span>' : ''}
          </div>
          <div class="bubble user-bubble">${escapeHtml(t.message)}</div>
          <div class="turn-result">
            <div class="badges">
              <span class="badge domain-badge" style="${domainBadgeStyle}" title="Expected: ${t.expected.domain}">
                <span class="domain-dot" style="background:${domainColor[t.actual.domain] ?? '#999'}"></span>
                ${t.actual.domain}
                ${!t.domainMatch ? ` (expected: ${t.expected.domain})` : ''}
              </span>
              <span class="badge view-badge" style="${!t.viewHintMatch ? 'color: var(--ou-accent); font-weight:600' : ''}">
                ${viewHintEmoji[t.actual.viewHint ?? ''] ?? ''} ${t.actual.viewHint ?? 'null'}
                ${!t.viewHintMatch ? ` (expected: ${t.expected.viewHint})` : ''}
              </span>
              <span class="badge conf-badge">${t.actual.confidence}</span>
            </div>
            ${extractedFields ? `<div class="extracted-fields">${extractedFields}</div>` : ''}
          </div>
        </div>`;
      })
      .join('');

    const accColor =
      r.accuracy.overall >= 80 ? '#4caf50' : r.accuracy.overall >= 60 ? '#ff9800' : 'var(--ou-accent)';

    return `
    <div class="persona-card">
      <div class="persona-header">
        <div class="persona-avatar">${r.persona.name[0]}</div>
        <div class="persona-info">
          <h3>${r.persona.name} <span class="persona-meta">${r.persona.age}세 ${r.persona.gender} / ${r.persona.occupation}</span></h3>
          <p class="persona-desc">${r.persona.description}</p>
        </div>
        <div class="persona-score" style="color:${accColor}">
          <div class="score-number">${r.accuracy.overall}%</div>
          <div class="score-label">Overall</div>
        </div>
      </div>
      <div class="persona-stats">
        <span>Domain: ${r.accuracy.domain}%</span>
        <span>ViewHint: ${r.accuracy.viewHint}%</span>
        <span>Turns: ${r.turns.length}</span>
      </div>
      <div class="turns">${turnsHtml}</div>
    </div>`;
  }

  const groupSections = Object.entries(groups)
    .map(
      ([groupName, groupResults]) => `
    <div class="group-section">
      <h2 class="group-title">${groupName}</h2>
      ${groupResults.map(renderPersonaCard).join('')}
    </div>`,
    )
    .join('');

  const domainBreakdownHtml = Object.entries(domainStats)
    .sort((a, b) => b[1].total - a[1].total)
    .map(
      ([domain, stat]) => `
      <div class="domain-stat-card">
        <span class="domain-dot-lg" style="background:${domainColor[domain] ?? '#999'}"></span>
        <span class="domain-name">${domain}</span>
        <span class="domain-accuracy">${Math.round((stat.correct / stat.total) * 100)}%</span>
        <span class="domain-count">${stat.correct}/${stat.total}</span>
      </div>`,
    )
    .join('');

  // Mismatches summary
  const mismatches: Array<{ persona: string; turn: number; message: string; expected: string; actual: string }> = [];
  for (const r of results) {
    for (let i = 0; i < r.turns.length; i++) {
      const t = r.turns[i];
      if (!t.domainMatch) {
        mismatches.push({
          persona: r.persona.name,
          turn: i + 1,
          message: t.message,
          expected: t.expected.domain,
          actual: t.actual.domain,
        });
      }
    }
  }

  const mismatchHtml =
    mismatches.length === 0
      ? '<p class="all-pass">All domain classifications matched expectations.</p>'
      : mismatches
          .map(
            (m) => `
      <div class="mismatch-row">
        <span class="mismatch-persona">${m.persona} T${m.turn}</span>
        <span class="mismatch-msg">${escapeHtml(m.message)}</span>
        <span class="mismatch-expected">${m.expected}</span>
        <span class="mismatch-arrow">&rarr;</span>
        <span class="mismatch-actual">${m.actual}</span>
      </div>`,
          )
          .join('');

  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  return `<!DOCTYPE html>
<html lang="ko" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OU Orb Pipeline Test Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
<style>
  @font-face {
    font-family: 'Pretendard Variable';
    src: url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
  }

  :root, [data-theme="light"] {
    --ou-bg: #e8ecf1;
    --ou-shadow-dark: rgba(163,177,198,0.6);
    --ou-shadow-light: rgba(255,255,255,0.6);
    --ou-text-body: rgba(0,0,0,0.58);
    --ou-text-strong: rgba(0,0,0,0.76);
    --ou-text-heading: rgba(0,0,0,0.88);
    --ou-text-muted: rgba(0,0,0,0.32);
    --ou-accent: #e8976b;
    --ou-neu-raised-lg: 8px 8px 16px var(--ou-shadow-dark), -8px -8px 16px var(--ou-shadow-light);
    --ou-neu-raised-md: 6px 6px 12px var(--ou-shadow-dark), -6px -6px 12px var(--ou-shadow-light);
    --ou-neu-raised-sm: 3px 3px 6px var(--ou-shadow-dark), -3px -3px 6px var(--ou-shadow-light);
    --ou-neu-pressed-md: inset 4px 4px 8px var(--ou-shadow-dark), inset -4px -4px 8px var(--ou-shadow-light);
    --ou-neu-pressed-sm: inset 2px 2px 4px var(--ou-shadow-dark), inset -2px -2px 4px var(--ou-shadow-light);
    --ou-radius-lg: 16px;
    --ou-radius-md: 12px;
    --ou-radius-sm: 8px;
    --ou-font-body: 'Pretendard Variable', 'DM Sans', sans-serif;
    --ou-font-display: 'DM Sans', sans-serif;
    --ou-font-logo: 'Orbitron', sans-serif;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--ou-font-body);
    background: var(--ou-bg);
    color: var(--ou-text-body);
    line-height: 1.6;
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  /* ─── Header ─── */
  .report-header {
    text-align: center;
    padding: 40px 24px;
    margin-bottom: 32px;
    background: var(--ou-bg);
    border-radius: var(--ou-radius-lg);
    box-shadow: var(--ou-neu-raised-lg);
  }
  .report-header .logo {
    font-family: var(--ou-font-logo);
    font-size: 36px;
    font-weight: 700;
    color: var(--ou-text-heading);
    letter-spacing: 2px;
  }
  .report-header h1 {
    font-family: var(--ou-font-display);
    font-size: 20px;
    font-weight: 500;
    color: var(--ou-text-strong);
    margin-top: 8px;
  }
  .report-header .timestamp {
    font-size: 13px;
    color: var(--ou-text-muted);
    margin-top: 8px;
  }

  /* ─── Summary Cards ─── */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }
  .summary-card {
    background: var(--ou-bg);
    border-radius: var(--ou-radius-md);
    box-shadow: var(--ou-neu-raised-md);
    padding: 20px;
    text-align: center;
  }
  .summary-card .stat-value {
    font-family: var(--ou-font-display);
    font-size: 32px;
    font-weight: 700;
    color: var(--ou-text-heading);
  }
  .summary-card .stat-label {
    font-size: 13px;
    color: var(--ou-text-muted);
    margin-top: 4px;
  }

  /* ─── Domain Breakdown ─── */
  .domain-breakdown {
    background: var(--ou-bg);
    border-radius: var(--ou-radius-md);
    box-shadow: var(--ou-neu-raised-md);
    padding: 24px;
    margin-bottom: 32px;
  }
  .domain-breakdown h2 {
    font-size: 16px;
    color: var(--ou-text-heading);
    margin-bottom: 16px;
  }
  .domain-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
  .domain-stat-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: var(--ou-radius-sm);
    box-shadow: var(--ou-neu-pressed-sm);
  }
  .domain-dot-lg {
    width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
  }
  .domain-name {
    font-size: 14px; font-weight: 500; color: var(--ou-text-strong); flex: 1;
  }
  .domain-accuracy {
    font-family: var(--ou-font-display);
    font-size: 16px; font-weight: 700; color: var(--ou-text-heading);
  }
  .domain-count {
    font-size: 12px; color: var(--ou-text-muted);
  }

  /* ─── Mismatches ─── */
  .mismatches-section {
    background: var(--ou-bg);
    border-radius: var(--ou-radius-md);
    box-shadow: var(--ou-neu-raised-md);
    padding: 24px;
    margin-bottom: 32px;
  }
  .mismatches-section h2 {
    font-size: 16px;
    color: var(--ou-text-heading);
    margin-bottom: 16px;
  }
  .mismatch-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--ou-radius-sm);
    box-shadow: var(--ou-neu-pressed-sm);
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  .mismatch-persona {
    font-weight: 600; font-size: 13px; color: var(--ou-text-strong);
    min-width: 80px;
  }
  .mismatch-msg {
    flex: 1; font-size: 13px; color: var(--ou-text-body);
    min-width: 200px;
  }
  .mismatch-expected {
    font-size: 13px; color: var(--ou-text-muted);
    text-decoration: line-through;
  }
  .mismatch-arrow { color: var(--ou-accent); font-weight: 700; }
  .mismatch-actual {
    font-size: 13px; color: var(--ou-accent); font-weight: 600;
  }
  .all-pass {
    color: #4caf50; font-weight: 500; text-align: center; padding: 16px;
  }

  /* ─── Group Sections ─── */
  .group-section { margin-bottom: 40px; }
  .group-title {
    font-family: var(--ou-font-display);
    font-size: 22px;
    font-weight: 600;
    color: var(--ou-text-heading);
    margin-bottom: 16px;
    padding-left: 4px;
  }

  /* ─── Persona Card ─── */
  .persona-card {
    background: var(--ou-bg);
    border-radius: var(--ou-radius-lg);
    box-shadow: var(--ou-neu-raised-md);
    padding: 24px;
    margin-bottom: 20px;
  }
  .persona-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
  }
  .persona-avatar {
    width: 48px; height: 48px; border-radius: 50%;
    background: var(--ou-bg);
    box-shadow: var(--ou-neu-raised-sm);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 600; color: var(--ou-text-heading);
    flex-shrink: 0;
  }
  .persona-info { flex: 1; }
  .persona-info h3 {
    font-size: 16px; color: var(--ou-text-heading); font-weight: 600;
  }
  .persona-meta {
    font-size: 13px; font-weight: 400; color: var(--ou-text-muted);
  }
  .persona-desc {
    font-size: 13px; color: var(--ou-text-body); margin-top: 2px;
  }
  .persona-score {
    text-align: center; flex-shrink: 0;
  }
  .score-number {
    font-family: var(--ou-font-display);
    font-size: 28px; font-weight: 700;
  }
  .score-label {
    font-size: 11px; color: var(--ou-text-muted); text-transform: uppercase;
  }
  .persona-stats {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--ou-text-muted);
    margin-bottom: 16px;
    padding: 8px 12px;
    border-radius: var(--ou-radius-sm);
    box-shadow: var(--ou-neu-pressed-sm);
  }

  /* ─── Turns ─── */
  .turns { display: flex; flex-direction: column; gap: 12px; }
  .turn {
    padding: 12px;
    border-radius: var(--ou-radius-sm);
  }
  .turn-header {
    display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
  }
  .turn-number {
    font-size: 11px; font-weight: 600; color: var(--ou-text-muted);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .context-badge {
    font-size: 11px; padding: 2px 8px;
    border-radius: 10px;
    background: var(--ou-accent);
    color: white; font-weight: 500;
  }

  /* ─── Chat Bubble ─── */
  .bubble {
    padding: 10px 16px;
    border-radius: 18px 18px 18px 4px;
    max-width: 80%;
    font-size: 14px;
    line-height: 1.5;
  }
  .user-bubble {
    background: var(--ou-bg);
    box-shadow: var(--ou-neu-raised-sm);
    color: var(--ou-text-strong);
  }

  /* ─── Turn Result ─── */
  .turn-result { margin-top: 8px; }
  .badges {
    display: flex; flex-wrap: wrap; gap: 6px;
  }
  .badge {
    font-size: 12px; padding: 3px 10px;
    border-radius: 10px;
    box-shadow: var(--ou-neu-pressed-sm);
    color: var(--ou-text-body);
  }
  .domain-badge {
    display: flex; align-items: center; gap: 4px;
  }
  .domain-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }

  /* ─── Extracted Fields ─── */
  .extracted-fields {
    display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;
  }
  .field-tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 8px;
    box-shadow: var(--ou-neu-pressed-sm);
    color: var(--ou-text-body);
    font-family: 'DM Sans', monospace;
  }

  /* ─── Responsive ─── */
  @media (max-width: 640px) {
    body { padding: 12px; }
    .persona-header { flex-wrap: wrap; }
    .bubble { max-width: 100%; }
    .summary-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>

<div class="report-header">
  <div class="logo">OU</div>
  <h1>Orb Pipeline Simulation Test Report</h1>
  <p class="timestamp">Generated: ${now}</p>
</div>

<div class="summary-grid">
  <div class="summary-card">
    <div class="stat-value">${results.length}</div>
    <div class="stat-label">Personas</div>
  </div>
  <div class="summary-card">
    <div class="stat-value">${totalTurns}</div>
    <div class="stat-label">Total Turns</div>
  </div>
  <div class="summary-card">
    <div class="stat-value">${Math.round((domainCorrect / totalTurns) * 100)}%</div>
    <div class="stat-label">Domain Accuracy</div>
  </div>
  <div class="summary-card">
    <div class="stat-value">${Math.round((viewHintCorrect / totalTurns) * 100)}%</div>
    <div class="stat-label">ViewHint Accuracy</div>
  </div>
  <div class="summary-card">
    <div class="stat-value">${keyFieldTotal > 0 ? Math.round((keyFieldCorrect / keyFieldTotal) * 100) : 'N/A'}%</div>
    <div class="stat-label">Field Extraction</div>
  </div>
</div>

<div class="domain-breakdown">
  <h2>Domain Classification Breakdown</h2>
  <div class="domain-stats-grid">${domainBreakdownHtml}</div>
</div>

<div class="mismatches-section">
  <h2>Classification Mismatches</h2>
  ${mismatchHtml}
</div>

${groupSections}

</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Main ───

async function main() {
  console.log('Running Orb pipeline simulation test...');
  console.log(`Personas: ${personas.length}`);
  console.log(`Total turns: ${personas.reduce((s, p) => s + p.turns.length, 0)}`);
  console.log('');

  const results = await runTests();

  // Print summary to console
  const totalTurns = results.reduce((s, r) => s + r.turns.length, 0);
  const domainCorrect = results.reduce(
    (s, r) => s + r.turns.filter((t) => t.domainMatch).length,
    0,
  );
  const viewHintCorrect = results.reduce(
    (s, r) => s + r.turns.filter((t) => t.viewHintMatch).length,
    0,
  );

  console.log('=== RESULTS ===');
  console.log(`Domain accuracy:   ${domainCorrect}/${totalTurns} (${Math.round((domainCorrect / totalTurns) * 100)}%)`);
  console.log(`ViewHint accuracy: ${viewHintCorrect}/${totalTurns} (${Math.round((viewHintCorrect / totalTurns) * 100)}%)`);
  console.log('');

  // Print mismatches
  const mismatches: string[] = [];
  for (const r of results) {
    for (let i = 0; i < r.turns.length; i++) {
      const t = r.turns[i];
      if (!t.domainMatch) {
        mismatches.push(
          `  [${r.persona.name} T${i + 1}] "${t.message}" => expected: ${t.expected.domain}, got: ${t.actual.domain}`,
        );
      }
    }
  }
  if (mismatches.length > 0) {
    console.log('MISMATCHES:');
    for (const m of mismatches) console.log(m);
  } else {
    console.log('No mismatches - all domain classifications correct!');
  }

  // Generate HTML report
  const html = generateHTML(results);
  const outPath = path.join(__dirname, '..', 'scenario-test-report.html');
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log(`\nHTML report written to: ${outPath}`);

  // Also write JSON results
  const jsonPath = path.join(__dirname, '..', 'scenario-test-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`JSON results written to: ${jsonPath}`);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
