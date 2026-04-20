/**
 * Orbit 마켓 썸네일 미리보기용 가상 데이터
 * 실제 사용자 데이터 없이도 뷰가 채워져 보이도록
 */

import dayjs from 'dayjs';

const today = dayjs();
const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

// 최근 30일 날짜 생성
const d = (offset: number) => fmt(today.add(offset, 'day'));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = { id: string; domain: string; domain_data: Record<string, any>; raw?: string; created_at: string };

const make = (id: string, domain: string, domain_data: Record<string, unknown>, raw?: string, daysAgo = 0): Node => ({
  id, domain, domain_data, raw,
  created_at: today.subtract(daysAgo, 'day').toISOString(),
});

// ── 일정 (schedule) ───────────────────────────────────────
const scheduleNodes: Node[] = [
  make('sc1', 'schedule', { date: d(0), time: '14:00', title: '민수랑 커피', location: '합정' }, undefined, 0),
  make('sc2', 'schedule', { date: d(0), time: '17:30', title: '팀 리뷰 회의' }, undefined, 0),
  make('sc3', 'schedule', { date: d(1), time: '10:00', title: '치과 예약', location: '강남역' }, undefined, 1),
  make('sc4', 'schedule', { date: d(2), time: '19:00', title: '수진이 생일 파티', location: '홍대' }, undefined, 2),
  make('sc5', 'schedule', { date: d(4), time: '13:00', title: '헬스장', location: '잠실' }, undefined, 4),
  make('sc6', 'schedule', { date: d(6), time: '11:00', title: '점심 미팅' }, undefined, 6),
  make('sc7', 'schedule', { date: d(7), time: '09:00', title: '주간 회의' }, undefined, 7),
  make('sc8', 'schedule', { date: d(9), title: '제주도 여행', location: '제주도' }, undefined, 9),
  make('sc9', 'schedule', { date: d(10), time: '20:00', title: '영화 관람', location: 'CGV 강남' }, undefined, 10),
  make('sc10', 'schedule', { date: d(13), time: '14:00', title: '면접', location: '판교' }, undefined, 13),
  make('sc11', 'schedule', { date: d(-2), time: '15:00', title: '병원 진료', location: '신촌' }, undefined, 0),
  make('sc12', 'schedule', { date: d(-5), time: '18:30', title: '동창 모임', location: '이태원' }, undefined, 0),
];

// ── 할 일 (task) ──────────────────────────────────────────
const taskNodes: Node[] = [
  make('tk1', 'task', { title: '기획서 3차 수정', status: 'in_progress', priority: 'high', due: d(1) }, undefined, 0),
  make('tk2', 'task', { title: '클라이언트 미팅 준비', status: 'todo', priority: 'high', due: d(0) }, undefined, 1),
  make('tk3', 'task', { title: '디자인 시안 검토', status: 'todo', priority: 'medium', due: d(2) }, undefined, 1),
  make('tk4', 'task', { title: '주간 보고서 작성', status: 'done', due: d(-1) }, undefined, 3),
  make('tk5', 'task', { title: '개발팀 코드 리뷰', status: 'in_progress', priority: 'medium' }, undefined, 0),
  make('tk6', 'task', { title: '팀 채용 인터뷰', status: 'todo', priority: 'high', due: d(5) }, undefined, 2),
  make('tk7', 'task', { title: '블로그 포스트 작성', status: 'todo' }, undefined, 4),
  make('tk8', 'task', { title: '서버 비용 정산', status: 'done' }, undefined, 7),
  make('tk9', 'task', { title: 'UI 컴포넌트 정리', status: 'todo', priority: 'low' }, undefined, 1),
];

// ── 지출 (finance) ────────────────────────────────────────
const financeNodes: Node[] = [
  make('fi1', 'finance', { amount: 8000, category: '식비', description: '점심 김치찌개', type: 'expense' }, undefined, 0),
  make('fi2', 'finance', { amount: 43000, category: '카페', description: '스타벅스', type: 'expense' }, undefined, 0),
  make('fi3', 'finance', { amount: 15000, category: '교통', description: '택시', type: 'expense' }, undefined, 1),
  make('fi4', 'finance', { amount: 120000, category: '쇼핑', description: '옷', type: 'expense' }, undefined, 2),
  make('fi5', 'finance', { amount: 3200000, category: '수입', description: '월급', type: 'income' }, undefined, 3),
  make('fi6', 'finance', { amount: 25000, category: '식비', description: '저녁 외식', type: 'expense' }, undefined, 3),
  make('fi7', 'finance', { amount: 9900, category: '구독', description: '넷플릭스', type: 'expense' }, undefined, 5),
  make('fi8', 'finance', { amount: 55000, category: '문화', description: '공연 티켓', type: 'expense' }, undefined, 6),
  make('fi9', 'finance', { amount: 12000, category: '카페', description: '블루보틀', type: 'expense' }, undefined, 7),
  make('fi10', 'finance', { amount: 89000, category: '식비', description: '마트 장보기', type: 'expense' }, undefined, 8),
  make('fi11', 'finance', { amount: 300000, category: '수입', description: '프리랜서 수입', type: 'income' }, undefined, 10),
  make('fi12', 'finance', { amount: 7000, category: '식비', description: '편의점', type: 'expense' }, undefined, 11),
];

// ── 습관 (habit) ──────────────────────────────────────────
const habitNodes: Node[] = Array.from({ length: 28 }, (_, i) => {
  const skip = [2, 7, 14, 20];
  if (skip.includes(i)) return null;
  return make(`hb${i}`, 'habit', { name: '운동', done: true, count: 1 }, undefined, i);
}).filter(Boolean) as Node[];

// ── 아이디어 (idea) ───────────────────────────────────────
const ideaNodes: Node[] = [
  make('id1', 'idea', { title: '배달앱 구독 모델', content: '매월 고정 비용으로 배달비 0원', tags: ['앱', '구독'] }, undefined, 1),
  make('id2', 'idea', { title: '사이드 프로젝트: AI 일기', content: 'LLM이 하루를 요약해주는 일기 앱', tags: ['AI', '앱'] }, undefined, 3),
  make('id3', 'idea', { title: '동네 식물 공유 플랫폼', content: '이웃과 식물 씨앗 나누기', tags: ['커뮤니티'] }, undefined, 5),
  make('id4', 'idea', { title: '번아웃 감지 알림', content: '패턴 분석으로 번아웃 예측', tags: ['건강', 'AI'] }, undefined, 8),
  make('id5', 'idea', { title: '독서 모임 앱', content: '책 진도 공유 + 토론 기능', tags: ['독서', '커뮤니티'] }, undefined, 12),
];

// ── 인물 (relation) ───────────────────────────────────────
const relationNodes: Node[] = [
  make('re1', 'relation', { name: '김민지', role: '디자이너', company: '카카오', relation: '대학 친구', memo: '제주도 좋아함' }, undefined, 2),
  make('re2', 'relation', { name: '박수진', role: '개발자', company: 'line', relation: '전 직장 동료', memo: '맛집 정보 잘 앎' }, undefined, 5),
  make('re3', 'relation', { name: '이정우', role: 'PM', company: 'toss', relation: '현 직장 동료', memo: '테니스 좋아함' }, undefined, 7),
  make('re4', 'relation', { name: '최하늘', role: '마케터', relation: '지인', memo: 'SNS 마케팅 전문가' }, undefined, 15),
  make('re5', 'relation', { name: '오세훈', role: '창업가', relation: '멘토', memo: 'SaaS 창업 경험 있음' }, undefined, 20),
];

// ── 지식 (knowledge) ──────────────────────────────────────
const knowledgeNodes: Node[] = [
  make('kn1', 'knowledge', { title: 'React useEffect', content: '사이드 이펙트 처리. 두 번째 인자로 의존성 배열 관리', tags: ['React', '프론트엔드'] }, undefined, 1),
  make('kn2', 'knowledge', { title: 'Zustand 사용법', content: 'create()로 스토어 정의, persist로 로컬 저장', tags: ['상태관리'] }, undefined, 3),
  make('kn3', 'knowledge', { title: '뉴모피즘 디자인', content: '빛과 그림자로 입체감을 표현하는 UI 스타일', tags: ['디자인'] }, undefined, 6),
  make('kn4', 'knowledge', { title: 'TypeScript 제네릭', content: '타입 매개변수로 재사용 가능한 타입 정의', tags: ['TypeScript'] }, undefined, 8),
  make('kn5', 'knowledge', { title: 'CSS Grid vs Flexbox', content: '2D 레이아웃은 Grid, 1D는 Flexbox', tags: ['CSS'] }, undefined, 10),
  make('kn6', 'knowledge', { title: 'Next.js App Router', content: '파일 기반 라우팅, Server/Client 컴포넌트 분리', tags: ['Next.js'] }, undefined, 12),
];

// ── 미디어 (media) ────────────────────────────────────────
const mediaNodes: Node[] = [
  make('me1', 'media', { title: '기생충', type: 'movie', rating: 9, director: '봉준호', memo: '2019년 최고작' }, undefined, 3),
  make('me2', 'media', { title: '옷소매 붉은 끝동', type: 'drama', rating: 8, memo: '이준호 연기 최고' }, undefined, 7),
  make('me3', 'media', { title: '세이노의 가르침', type: 'book', rating: 8, memo: '실용적인 자기계발서' }, undefined, 10),
  make('me4', 'media', { title: 'Dune Part 2', type: 'movie', rating: 9, memo: '비주얼 압도적' }, undefined, 14),
  make('me5', 'media', { title: '친애하는 나에게', type: 'book', rating: 7, memo: '자기 성찰 에세이' }, undefined, 20),
];

// ── 장소 (location) ───────────────────────────────────────
const locationNodes: Node[] = [
  make('lo1', 'location', { name: '블루보틀 성수', address: '서울 성동구 성수동', category: '카페', memo: '커피 맛집, 줄 서야 함' }, undefined, 2),
  make('lo2', 'location', { name: '광장시장', address: '서울 종로구 예지동', category: '음식', memo: '빈대떡, 마약김밥' }, undefined, 5),
  make('lo3', 'location', { name: '북서울꿈의숲', address: '서울 강북구', category: '공원', memo: '산책하기 좋음' }, undefined, 8),
  make('lo4', 'location', { name: '익선동 한옥마을', address: '서울 종로구 익선동', category: '관광', memo: '사진 찍기 좋음' }, undefined, 12),
];

// ── 건강 (health) ─────────────────────────────────────────
const healthNodes: Node[] = [
  make('he1', 'health', { type: 'journal', mood: '좋음', content: '오늘 운동하고 기분이 좋아졌다' }, undefined, 0),
  make('he2', 'health', { type: 'journal', mood: '보통', content: '조금 피곤하지만 괜찮다' }, undefined, 1),
  make('he3', 'health', { type: 'symptom', symptom: '두통', severity: 2 }, undefined, 3),
  make('he4', 'health', { type: 'journal', mood: '좋음', content: '7시간 잘 잤다. 상쾌하다' }, undefined, 5),
  make('he5', 'health', { type: 'journal', mood: '나쁨', content: '스트레스가 심한 하루였다' }, undefined, 8),
];

// ── 교육 (education) ──────────────────────────────────────
const educationNodes: Node[] = [
  make('ed1', 'education', { course: '알고리즘 특강', week: 1, topic: '시간복잡도 분석', done: true }, undefined, 7),
  make('ed2', 'education', { course: '알고리즘 특강', week: 2, topic: 'BFS/DFS', done: true }, undefined, 5),
  make('ed3', 'education', { course: '알고리즘 특강', week: 3, topic: '다이나믹 프로그래밍', done: false }, undefined, 2),
  make('ed4', 'education', { course: 'React 고급', week: 1, topic: 'useState vs useReducer', done: true }, undefined, 10),
  make('ed5', 'education', { course: 'React 고급', week: 2, topic: '커스텀 훅 패턴', done: true }, undefined, 7),
];

// ── 도메인 → 샘플 노드 맵 ─────────────────────────────────
export const SAMPLE_NODES_BY_DOMAIN: Record<string, Node[]> = {
  schedule: scheduleNodes,
  task: taskNodes,
  finance: financeNodes,
  habit: habitNodes,
  idea: ideaNodes,
  relation: relationNodes,
  knowledge: knowledgeNodes,
  media: mediaNodes,
  location: locationNodes,
  health: healthNodes,
  education: educationNodes,
};

// viewType → 주 도메인 (썸네일 데이터 선택용)
const VIEW_TYPE_DOMAIN_OVERRIDE: Record<string, string> = {
  todo: 'task', calendar: 'schedule', timeline: 'schedule',
  chart: 'finance', heatmap: 'habit',
  profile: 'relation', journal: 'health',
  curriculum: 'education', lecture: 'education',
  scrap: 'knowledge', table: 'knowledge', flashcard: 'knowledge',
  youtube: 'media',
};

export function getSampleNodes(viewType: string, domain: string): Node[] {
  const key = VIEW_TYPE_DOMAIN_OVERRIDE[viewType] || domain;
  return SAMPLE_NODES_BY_DOMAIN[key] || knowledgeNodes;
}

// 썸네일 미리보기 불가능한 뷰 타입 (map은 카카오SDK 필요, inline은 작아서 미리보기 불필요)
export const NO_THUMBNAIL_TYPES = new Set([
  'map', 'boncho', 'shanghanlun', 'dictionary',
]);
