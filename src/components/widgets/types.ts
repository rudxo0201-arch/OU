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
  component: ComponentType<{ widgetId: string }>;
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

export const GRID_COLS = 6;
export const GRID_ROWS = 4;

export type GridPreset = 'fine' | 'medium' | 'coarse';

export const GRID_PRESETS: Record<GridPreset, { label: string; sub: string; cols: number; rows: number }> = {
  fine:   { label: '많은 그리드', sub: '세밀한 배치',   cols: 10, rows: 6 },
  medium: { label: '중간 그리드', sub: '기본 크기',     cols: 6,  rows: 4 },
  coarse: { label: '적은 그리드', sub: '간단한 배치',   cols: 4,  rows: 3 },
};
