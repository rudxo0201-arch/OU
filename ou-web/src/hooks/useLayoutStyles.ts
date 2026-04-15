import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  DEFAULT_LAYOUT_CONFIG,
  type LayoutConfig, type FieldConfig,
  type BoxStyle, type TextStyle, type GridStyle,
} from '@/types/layout-config';

interface LayoutStyles {
  card: CSSProperties;
  primary: CSSProperties;
  secondary: CSSProperties;
  tertiary: CSSProperties;
  gridColumns: number | Record<string, number>;
  gridGap: number;
  isFieldVisible: (field: string) => boolean;
}

function mergeBox(defaults: Required<BoxStyle>, overrides?: BoxStyle): Required<BoxStyle> {
  if (!overrides) return defaults;
  return {
    backgroundColor: overrides.backgroundColor ?? defaults.backgroundColor,
    borderColor: overrides.borderColor ?? defaults.borderColor,
    borderWidth: overrides.borderWidth ?? defaults.borderWidth,
    borderRadius: overrides.borderRadius ?? defaults.borderRadius,
    padding: overrides.padding ?? defaults.padding,
  };
}

function mergeText(defaults: Required<TextStyle>, overrides?: TextStyle): Required<TextStyle> {
  if (!overrides) return defaults;
  return {
    fontSize: overrides.fontSize ?? defaults.fontSize,
    fontWeight: overrides.fontWeight ?? defaults.fontWeight,
    color: overrides.color ?? defaults.color,
    lineHeight: overrides.lineHeight ?? defaults.lineHeight,
  };
}

function mergeGrid(defaults: Required<GridStyle>, overrides?: GridStyle): Required<GridStyle> {
  if (!overrides) return defaults;
  return {
    columns: overrides.columns ?? defaults.columns,
    gap: overrides.gap ?? defaults.gap,
  };
}

export function useLayoutStyles(config?: LayoutConfig): LayoutStyles {
  return useMemo(() => {
    const d = DEFAULT_LAYOUT_CONFIG;

    const card = mergeBox(d.card as Required<BoxStyle>, config?.card);
    const primary = mergeText(d.textStyles!.primary as Required<TextStyle>, config?.textStyles?.primary);
    const secondary = mergeText(d.textStyles!.secondary as Required<TextStyle>, config?.textStyles?.secondary);
    const tertiary = mergeText(d.textStyles!.tertiary as Required<TextStyle>, config?.textStyles?.tertiary);
    const grid = mergeGrid(d.grid as Required<GridStyle>, config?.grid);
    const fields = config?.fields ?? {};

    return {
      card: {
        backgroundColor: card.backgroundColor,
        border: `${card.borderWidth}px solid ${card.borderColor}`,
        borderRadius: card.borderRadius,
        padding: card.padding,
      },
      primary: {
        fontSize: primary.fontSize,
        fontWeight: primary.fontWeight,
        color: primary.color,
        lineHeight: primary.lineHeight,
      },
      secondary: {
        fontSize: secondary.fontSize,
        fontWeight: secondary.fontWeight,
        color: secondary.color,
        lineHeight: secondary.lineHeight,
      },
      tertiary: {
        fontSize: tertiary.fontSize,
        fontWeight: tertiary.fontWeight,
        color: tertiary.color,
        lineHeight: tertiary.lineHeight,
      },
      gridColumns: grid.columns,
      gridGap: grid.gap,
      isFieldVisible: (field: string) => {
        const fc: FieldConfig | undefined = fields[field];
        return fc?.visible !== false;
      },
    };
  }, [config]);
}
