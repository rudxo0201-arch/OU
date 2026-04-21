import type { WidgetInstance } from './types';

/** 튜토리얼 초기 레이아웃 — Orb만 가운데 (10×6 기준) */
export const TUTORIAL_INITIAL_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view', type: 'ou-view', x: 3, y: 2, w: 4, h: 2 },
];

/**
 * 기본 레이아웃 — MVP 4도메인 (10×6 그리드)
 *
 * 페이지 1: ORB(3×3) + CLOCK(5×3) + STREAK(2×3)
 *           오늘일정(5×3) + 할일(5×3)
 */
export const DEFAULT_LAYOUT: WidgetInstance[] = [
  // Row 0-2
  { id: 'ou-view',        type: 'ou-view',       x: 0, y: 0, w: 3, h: 3 },
  { id: 'clock',          type: 'clock',          x: 3, y: 0, w: 5, h: 3 },
  { id: 'streak',         type: 'streak',         x: 8, y: 0, w: 2, h: 3 },
  // Row 3-5
  { id: 'today-schedule', type: 'today-schedule', x: 0, y: 3, w: 5, h: 3 },
  { id: 'today-tasks',    type: 'today-tasks',    x: 5, y: 3, w: 5, h: 3 },
];

/**
 * 기본 2페이지: 습관 + 아이디어 + 히트맵 (10×6 기준)
 */
export const DEFAULT_PAGE2_LAYOUT: WidgetInstance[] = [
  { id: 'habit-log',     type: 'habit-log',     x: 0, y: 0, w: 5, h: 3 },
  { id: 'idea-notes',    type: 'idea-notes',    x: 5, y: 0, w: 5, h: 3 },
  { id: 'chat-heatmap',  type: 'chat-heatmap',  x: 0, y: 3, w: 5, h: 2 },
  { id: 'today-summary', type: 'today-summary', x: 5, y: 3, w: 5, h: 2 },
];

/** 관리자 전용 레이아웃 (10×6) */
export const ADMIN_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view',        type: 'ou-view',       x: 0, y: 0, w: 3, h: 3 },
  { id: 'clock',          type: 'clock',          x: 3, y: 0, w: 5, h: 3 },
  { id: 'streak',         type: 'streak',         x: 8, y: 0, w: 2, h: 3 },
  { id: 'today-schedule', type: 'today-schedule', x: 0, y: 3, w: 5, h: 3 },
  { id: 'view-map',       type: 'view-map',       x: 5, y: 3, w: 5, h: 3 },
];

export const ADMIN_PAGE2_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view-p2', type: 'ou-view', x: 3, y: 2, w: 4, h: 2 },
];
