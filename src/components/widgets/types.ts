import type { ComponentType } from 'react';

export type ScrollPolicy = 'none' | 'vertical' | 'horizontal' | 'both';

export type SizePreset = 'mini' | 'horizontal' | 'vertical' | 'large' | 'wide' | 'fullWide';

export const SIZE_PRESETS: Record<SizePreset, [cols: number, rows: number]> = {
  mini:       [2, 2],
  horizontal: [3, 2],
  vertical:   [2, 3],
  large:      [3, 3],
  wide:       [4, 2],
  fullWide:   [6, 2],
};

export interface WidgetDef {
  type: string;
  label: string;
  component: ComponentType<{ widgetId: string; widgetType?: string }>;
  scrollable: ScrollPolicy;
  minSize: [cols: number, rows: number];
  defaultSize: [cols: number, rows: number];
  removable: boolean;
  needsCard: boolean;
}

export interface WidgetInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const GRID_COLS = 16;
export const GRID_ROWS = 9;

export type GridPreset = 'large' | 'medium' | 'small';

export const GRID_PRESETS: Record<GridPreset, { label: string; sub: string; cols: number; rows: number }> = {
  large:  { label: '큰 아이콘',   sub: '적은 그리드',   cols: 10, rows: 6  },
  medium: { label: '중간 아이콘', sub: '기본',          cols: 16, rows: 9  },
  small:  { label: '작은 아이콘', sub: '촘촘한 그리드', cols: 20, rows: 12 },
};
