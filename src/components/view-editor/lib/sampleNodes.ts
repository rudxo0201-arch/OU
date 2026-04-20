export interface SampleNode {
  id: string;
  title: string;
  domain: string;
  domain_data: Record<string, unknown>;
  created_at: string;
  importance: number;
}

const now = new Date();
const d = (days: number) => new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);

export const SAMPLE_NODES: Record<string, SampleNode[]> = {
  task: [
    { id: 's1', title: '기획서 작성', domain: 'task', domain_data: { status: 'in_progress', priority: 'high', due: d(2), tag: '업무' }, created_at: d(-1), importance: 3 },
    { id: 's2', title: '디자인 리뷰', domain: 'task', domain_data: { status: 'todo', priority: 'medium', due: d(5), tag: '업무' }, created_at: d(-2), importance: 2 },
    { id: 's3', title: '운동 30분', domain: 'task', domain_data: { status: 'done', priority: 'low', due: d(0), tag: '개인' }, created_at: d(0), importance: 1 },
    { id: 's4', title: '코드 리뷰', domain: 'task', domain_data: { status: 'todo', priority: 'high', due: d(1), tag: '업무' }, created_at: d(0), importance: 3 },
  ],
  schedule: [
    { id: 's5', title: '팀 미팅', domain: 'schedule', domain_data: { date: d(1), time: '10:00', place: '회의실 A' }, created_at: d(-1), importance: 2 },
    { id: 's6', title: '점심 약속', domain: 'schedule', domain_data: { date: d(3), time: '12:30', place: '강남' }, created_at: d(-1), importance: 1 },
    { id: 's7', title: '치과 예약', domain: 'schedule', domain_data: { date: d(7), time: '14:00', place: '서울치과' }, created_at: d(-3), importance: 2 },
  ],
  finance: [
    { id: 's8', title: '커피', domain: 'finance', domain_data: { date: d(0), category: '식비', amount: 4500 }, created_at: d(0), importance: 1 },
    { id: 's9', title: '구독 서비스', domain: 'finance', domain_data: { date: d(-5), category: '구독', amount: 14900 }, created_at: d(-5), importance: 1 },
    { id: 's10', title: '식료품', domain: 'finance', domain_data: { date: d(-2), category: '식비', amount: 52000 }, created_at: d(-2), importance: 2 },
  ],
  habit: [
    { id: 's11', title: '물 2L 마시기', domain: 'habit', domain_data: { date: d(0), habit: '수분 섭취', streak: 7 }, created_at: d(0), importance: 2 },
    { id: 's12', title: '독서 30분', domain: 'habit', domain_data: { date: d(0), habit: '독서', streak: 3 }, created_at: d(0), importance: 2 },
    { id: 's13', title: '명상 10분', domain: 'habit', domain_data: { date: d(-1), habit: '명상', streak: 14 }, created_at: d(-1), importance: 3 },
  ],
  emotion: [
    { id: 's14', title: '오늘 좋은 하루', domain: 'emotion', domain_data: { date: d(0), valence: 'positive', tag: '일상' }, created_at: d(0), importance: 2 },
    { id: 's15', title: '발표 불안', domain: 'emotion', domain_data: { date: d(-1), valence: 'anxious', tag: '업무' }, created_at: d(-1), importance: 2 },
    { id: 's16', title: '친구 만남 행복', domain: 'emotion', domain_data: { date: d(-3), valence: 'happy', tag: '사람' }, created_at: d(-3), importance: 3 },
  ],
  knowledge: [
    { id: 's17', title: 'React 서버 컴포넌트', domain: 'knowledge', domain_data: { date: d(-2), topic: '프론트엔드', tag: 'React' }, created_at: d(-2), importance: 3 },
    { id: 's18', title: 'Zustand 상태 관리', domain: 'knowledge', domain_data: { date: d(-4), topic: '프론트엔드', tag: 'Zustand' }, created_at: d(-4), importance: 2 },
    { id: 's19', title: 'PostgreSQL 인덱스', domain: 'knowledge', domain_data: { date: d(-7), topic: '데이터베이스', tag: 'SQL' }, created_at: d(-7), importance: 2 },
  ],
};

export function getSampleNodes(domain?: string, limit = 20): SampleNode[] {
  if (!domain) {
    return Object.values(SAMPLE_NODES).flat().slice(0, limit);
  }
  return (SAMPLE_NODES[domain] ?? []).slice(0, limit);
}
