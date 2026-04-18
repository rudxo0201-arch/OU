import type { WidgetInstance } from './types';

export const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: 'today-summary',  type: 'today-summary',   x: 2, y: 0, w: 2, h: 1 },
  { id: 'clock',          type: 'clock',           x: 4, y: 0, w: 2, h: 1 },
  { id: 'ou-view',        type: 'ou-view',        x: 1, y: 1, w: 4, h: 1 },
  { id: 'recent-nodes',   type: 'recent-nodes',    x: 1, y: 2, w: 4, h: 2 },
];

/** 관리자 전용 레이아웃 — 본초/한자 뷰 포함 */
export const ADMIN_LAYOUT: WidgetInstance[] = [
  { id: 'ou-view',        type: 'ou-view',        x: 1, y: 0, w: 4, h: 1 },
  { id: 'clock',          type: 'clock',           x: 5, y: 0, w: 1, h: 1 },
  { id: 'view-boncho',    type: 'view-boncho',    x: 0, y: 1, w: 6, h: 3 },
];
