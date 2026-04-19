import type { WidgetInstance } from './types';

export const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: 'today-summary',  type: 'today-summary',   x: 2, y: 0, w: 2, h: 1 },
  { id: 'clock',          type: 'clock',           x: 4, y: 0, w: 2, h: 1 },
  { id: 'ou-view',        type: 'ou-view',        x: 1, y: 1, w: 4, h: 1 },
  { id: 'recent-nodes',   type: 'recent-nodes',    x: 1, y: 2, w: 4, h: 2 },
];

/** 관리자 전용 레이아웃 — 한자사전 뷰 포함 */
export const ADMIN_LAYOUT: WidgetInstance[] = [
  { id: 'view-dictionary', type: 'view-dictionary', x: 0, y: 0, w: 4, h: 4 },
  { id: 'ou-view',         type: 'ou-view',         x: 4, y: 0, w: 2, h: 2 },
  { id: 'clock',           type: 'clock',            x: 4, y: 2, w: 1, h: 1 },
];

/** 관리자 페이지 2 — 본초학 뷰 */
export const ADMIN_PAGE2_LAYOUT: WidgetInstance[] = [
  { id: 'view-boncho', type: 'view-boncho', x: 0, y: 0, w: 3, h: 3 },
  { id: 'ou-view-p2',  type: 'ou-view',    x: 3, y: 0, w: 3, h: 2 },
  { id: 'clock-p2',    type: 'clock',      x: 3, y: 2, w: 1, h: 1 },
];
