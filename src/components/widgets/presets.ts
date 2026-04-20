import type { WidgetInstance } from './types';

/** 튜토리얼 초기 레이아웃 — Orb만 가운데 */
export const TUTORIAL_INITIAL_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view', type: 'ou-view', x: 1, y: 1, w: 4, h: 2 },
];

/**
 * 기본 레이아웃 — 디자인 시안 기반 (6×4 그리드)
 *
 * 페이지 1: ORB + TODAY + STREAK + 오늘일정 + API토큰
 *   [ORB(2×2)] [TODAY(3×2)] [STREAK(1×2)]
 *   [오늘일정(3×2)] [API토큰(3×2)]    ← 각각 2 rows
 *   → 총 4행
 */
export const DEFAULT_LAYOUT: WidgetInstance[] = [
  // Row 0-1
  { id: 'ou-view',       type: 'ou-view',        x: 0, y: 0, w: 2, h: 2 },
  { id: 'clock',         type: 'clock',           x: 2, y: 0, w: 3, h: 2 },
  { id: 'streak',        type: 'streak',          x: 5, y: 0, w: 1, h: 2 },
  // Row 2-3
  { id: 'today-schedule',type: 'today-schedule',  x: 0, y: 2, w: 3, h: 2 },
  { id: 'api-token',     type: 'api-token',       x: 3, y: 2, w: 3, h: 2 },
];

/**
 * 기본 2페이지: 최근기억 + 히트맵 + 기억노드
 *
 *   [최근기억(3×3)] [히트맵(3×1)]
 *                   [기억노드(3×2)]
 *   → 총 3행 (row 0-2)
 */
export const DEFAULT_PAGE2_LAYOUT: WidgetInstance[] = [
  { id: 'recent-nodes',  type: 'recent-nodes',   x: 0, y: 0, w: 3, h: 3 },
  { id: 'chat-heatmap',  type: 'chat-heatmap',   x: 3, y: 0, w: 3, h: 1 },
  { id: 'today-summary', type: 'today-summary',  x: 3, y: 1, w: 3, h: 2 },
];

/** 관리자 전용 레이아웃 */
export const ADMIN_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view',       type: 'ou-view',        x: 0, y: 0, w: 2, h: 2 },
  { id: 'clock',         type: 'clock',           x: 2, y: 0, w: 3, h: 2 },
  { id: 'streak',        type: 'streak',          x: 5, y: 0, w: 1, h: 2 },
  { id: 'today-schedule',type: 'today-schedule',  x: 0, y: 2, w: 3, h: 2 },
  { id: 'view-map',      type: 'view-map',        x: 3, y: 2, w: 3, h: 2 },
];

export const ADMIN_PAGE2_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view-p2',    type: 'ou-view',        x: 1, y: 1, w: 4, h: 2 },
];
