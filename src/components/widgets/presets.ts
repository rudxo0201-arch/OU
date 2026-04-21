import type { WidgetInstance } from './types';

/** 튜토리얼 초기 레이아웃 — Orb만 가운데 (16×9 기준) */
export const TUTORIAL_INITIAL_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view', type: 'ou-view', x: 5, y: 3, w: 6, h: 3 },
];

/**
 * 기본 레이아웃 — MVP 4도메인 (16×9 그리드)
 *
 * 페이지 1: ORB(5×4) + CLOCK(8×4) + STREAK(3×4)
 *           오늘일정(8×5) + 할일(8×5)
 */
export const DEFAULT_LAYOUT: WidgetInstance[] = [
  // Row 0-3
  { id: 'ou-view',        type: 'ou-view',       x: 0,  y: 0, w: 5, h: 4 },
  { id: 'clock',          type: 'clock',          x: 5,  y: 0, w: 8, h: 4 },
  { id: 'streak',         type: 'streak',         x: 13, y: 0, w: 3, h: 4 },
  // Row 4-8
  { id: 'today-schedule', type: 'today-schedule', x: 0,  y: 4, w: 8, h: 5 },
  { id: 'today-tasks',    type: 'today-tasks',    x: 8,  y: 4, w: 8, h: 5 },
];

/**
 * 기본 2페이지: 습관 + 아이디어 + 히트맵 (16×9 기준)
 */
export const DEFAULT_PAGE2_LAYOUT: WidgetInstance[] = [
  { id: 'habit-log',     type: 'habit-log',     x: 0, y: 0, w: 8, h: 5 },
  { id: 'idea-notes',    type: 'idea-notes',    x: 8, y: 0, w: 8, h: 5 },
  { id: 'chat-heatmap',  type: 'chat-heatmap',  x: 0, y: 5, w: 8, h: 4 },
  { id: 'today-summary', type: 'today-summary', x: 8, y: 5, w: 8, h: 4 },
];

/** 관리자 전용 레이아웃 (16×9) */
export const ADMIN_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view',        type: 'ou-view',       x: 0,  y: 0, w: 5, h: 4 },
  { id: 'clock',          type: 'clock',          x: 5,  y: 0, w: 8, h: 4 },
  { id: 'streak',         type: 'streak',         x: 13, y: 0, w: 3, h: 4 },
  { id: 'today-schedule', type: 'today-schedule', x: 0,  y: 4, w: 8, h: 5 },
  { id: 'view-map',       type: 'view-map',       x: 8,  y: 4, w: 8, h: 5 },
];

export const ADMIN_PAGE2_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view-p2', type: 'ou-view', x: 5, y: 3, w: 6, h: 3 },
];
