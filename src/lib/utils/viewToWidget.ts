/**
 * viewType → widgetType 매핑 유틸
 * 뷰 상세 페이지와 Orbit 마켓에서 공유 사용
 */

// widgetStore 순환 참조 없이 사용하기 위해 registry import 안 함
// widgetType 존재 여부는 register.ts에서 실제 등록된 타입 기준

const VIEW_TO_WIDGET: Record<string, string> = {
  calendar: 'view-calendar',
  todo: 'view-todo',
  chart: 'view-chart',
  heatmap: 'view-heatmap',
  relation: 'view-relation',
  profile: 'view-profile',
  map: 'view-map',
  boncho: 'view-boncho',
  dictionary: 'view-dictionary',
};

const WIDGET_DEFAULT_SIZES: Record<string, [number, number]> = {
  'view-calendar': [4, 3],
  'view-todo': [3, 3],
  'view-chart': [3, 3],
  'view-heatmap': [4, 2],
  'view-relation': [3, 3],
  'view-profile': [3, 3],
  'view-map': [4, 3],
  'view-boncho': [3, 3],
  'view-dictionary': [6, 4],
};

export function getWidgetTypeForView(viewType: string): string | null {
  return VIEW_TO_WIDGET[viewType] ?? null;
}

export function getWidgetDefaultSize(widgetType: string): [number, number] {
  return WIDGET_DEFAULT_SIZES[widgetType] ?? [3, 3];
}
