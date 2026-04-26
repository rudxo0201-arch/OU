'use client';

// QSBar 컴포넌트가 제거됨(D-012). 위젯 타입은 widgets/registry.ts에서 INPUT_BAR로 migration.
export function QSBarWidget({ widgetId: _ }: { widgetId: string }) {
  return null;
}
