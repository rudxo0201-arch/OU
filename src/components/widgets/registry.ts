import type { WidgetDef } from './types';
import { WIDGET_TYPES } from '@/lib/ou-registry';

const registry = new Map<string, WidgetDef>();

/**
 * 위젯 타입 마이그레이션 맵.
 * DB에 저장된 구 타입 → 현재 타입으로 자동 리매핑된다.
 * 타입을 제거할 때 기존 등록을 지우는 대신 여기에 추가한다.
 */
const WIDGET_TYPE_MIGRATIONS: Record<string, string> = {
  'qsbar': WIDGET_TYPES.INPUT_BAR,   // 2026-04-26: QSBar → OuLLM 통합
};

export function registerWidget(def: WidgetDef) {
  registry.set(def.type, def);
}

export function getWidgetDef(type: string): WidgetDef | undefined {
  const resolvedType = WIDGET_TYPE_MIGRATIONS[type] ?? type;
  return registry.get(resolvedType);
}

export function getAllWidgetDefs(): WidgetDef[] {
  return Array.from(registry.values());
}
