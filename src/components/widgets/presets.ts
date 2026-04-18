import type { WidgetInstance } from './types';

export const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: 'today-summary',  type: 'today-summary',   x: 2, y: 0, w: 2, h: 1 },
  { id: 'clock',          type: 'clock',           x: 4, y: 0, w: 2, h: 1 },
  { id: 'ou-view',        type: 'ou-view',        x: 1, y: 1, w: 4, h: 1 },
  { id: 'recent-nodes',   type: 'recent-nodes',    x: 1, y: 2, w: 4, h: 2 },
];
