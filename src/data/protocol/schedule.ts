import type { ProtocolEvent } from '@/lib/protocol/engine';

export const SCHEDULE_EVENTS: ProtocolEvent[] = [
  {
    id: 'schedule.welcome',
    scope: { orb: 'calendar' },
    title: '일정을 적어볼까요?',
    body: 'OU가 알아서 정리해드려요. 자유롭게 말하거나 형식에 맞게 적어보세요.',
    cta: '시작하기',
    predicate: (ctx) => !ctx.orbState['calendar']?.tutorialCompleted,
    priority: 100,
  },
  {
    id: 'schedule.list_visible',
    scope: { orb: 'calendar' },
    title: '일정이 자동으로 정리돼요.',
    body: '입력한 내용이 바로 목록에 나타나요. 계속 쌓아보세요.',
    cta: '확인',
    predicate: (ctx) =>
      ctx.orbState['calendar']?.tutorialCompleted === true &&
      (ctx.domainCounts['schedule'] ?? 0) >= 1 &&
      !(ctx.firedEvents.has('schedule.list_visible')),
    priority: 80,
  },
  {
    id: 'schedule.calendar_unlock',
    scope: { orb: 'calendar' },
    title: '캘린더 뷰가 열렸어요.',
    body: '일정이 쌓이면 한눈에 볼 수 있어요.',
    cta: '캘린더 보기',
    predicate: (ctx) =>
      (ctx.domainCounts['schedule'] ?? 0) >= 3 &&
      !(ctx.firedEvents.has('schedule.calendar_unlock')),
    priority: 70,
  },
  {
    id: 'schedule.todo_suggest',
    scope: { orb: 'calendar' },
    title: '이 항목은 할 일에 가까워요.',
    body: '기간이 지나도 남아있는 항목은 할 일 Orb에서 관리하면 편해요.',
    cta: '할 일로 보기',
    predicate: (ctx) =>
      (ctx.domainCounts['schedule'] ?? 0) >= 5 &&
      !(ctx.firedEvents.has('schedule.todo_suggest')),
    priority: 50,
    cooldownMs: 7 * 24 * 60 * 60 * 1000,
  },
];
