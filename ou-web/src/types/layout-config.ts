// 데이터뷰 비주얼 디자인 설정 타입
// saved_views.layout_config JSONB에 저장됨

export interface TextStyle {
  fontSize?: number;      // px
  fontWeight?: number;    // 400~700
  color?: string;         // CSS color string
  lineHeight?: number;    // 배수 (1.2, 1.5 등)
}

export interface BoxStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;   // px, 0~4
  borderRadius?: number;  // px, 0~24
  padding?: number;       // px, 4~32
}

export interface GridStyle {
  columns?: number | Record<string, number>;  // 고정 or 반응형 breakpoint
  gap?: number;           // px
}

export interface FieldConfig {
  visible?: boolean;      // 기본 true
}

export interface LayoutConfig {
  card?: BoxStyle;
  textStyles?: {
    primary?: TextStyle;    // 메인 (한자 char, 제목 등)
    secondary?: TextStyle;  // 보조 (읽기, 설명 등)
    tertiary?: TextStyle;   // 메타 (획수, 급수 등)
  };
  grid?: GridStyle;
  fields?: Record<string, FieldConfig>;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  card: {
    backgroundColor: 'transparent',
    borderColor: 'var(--mantine-color-default-border)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  textStyles: {
    primary:   { fontSize: 32, fontWeight: 700, color: 'inherit', lineHeight: 1.2 },
    secondary: { fontSize: 12, fontWeight: 400, color: 'var(--mantine-color-dimmed)', lineHeight: 1.5 },
    tertiary:  { fontSize: 10, fontWeight: 400, color: 'var(--mantine-color-dimmed)', lineHeight: 1.5 },
  },
  grid: {
    columns: { base: 4, xs: 5, sm: 6, md: 8, lg: 10 },
    gap: 8,
  },
  fields: {},
};
