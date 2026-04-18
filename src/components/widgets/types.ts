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
