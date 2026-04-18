import type { WidgetDef } from './types';

const registry = new Map<string, WidgetDef>();

export function registerWidget(def: WidgetDef) {
  registry.set(def.type, def);
}

export function getWidgetDef(type: string): WidgetDef | undefined {
  return registry.get(type);
}

export function getAllWidgetDefs(): WidgetDef[] {
  return Array.from(registry.values());
}
