import type { WidgetInstance } from './types';

/** 튜토리얼 초기 레이아웃 — Orb만 가운데 */
export const TUTORIAL_INITIAL_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view', type: 'ou-view', x: 1, y: 1, w: 4, h: 2 },
];

export const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view', type: 'ou-view', x: 1, y: 1, w: 4, h: 2 },
];

/** 관리자 전용 레이아웃 — Orb만 */
export const ADMIN_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view', type: 'ou-view', x: 1, y: 1, w: 4, h: 2 },
];

/** 관리자 페이지 2 — Orb만 */
export const ADMIN_PAGE2_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view-p2', type: 'ou-view', x: 1, y: 1, w: 4, h: 2 },
];
