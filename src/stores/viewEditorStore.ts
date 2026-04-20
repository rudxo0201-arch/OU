import { create } from 'zustand';
import type { SavedViewRow } from '@/types/admin';
import type { LayoutConfig } from '@/types/layout-config';
import type { FilterRule, OrbViewConfig } from '@/types/view-editor';

// 점(.) 구분 경로로 중첩 객체 값 설정
function setNested(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;
  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown> || {}) };
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  return result;
}

interface ViewEditorState {
  isOpen: boolean;
  editingView: SavedViewRow | null;
  // 폼 상태
  name: string;
  viewType: string;
  icon: string;
  description: string;
  filterConfig: Record<string, unknown>;
  layoutConfig: LayoutConfig;
  schemaMap: Record<string, string>;
  visibility: 'private' | 'link' | 'public';
  isDefault: boolean;
  customCode: string;
  isDirty: boolean;
  saving: boolean;
  // 뷰 편집기 전용 상태
  domain: string;
  filterRules: FilterRule[];
  groupBy: string;
  sortField: string;
  sortDir: 'asc' | 'desc';
  range: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
  // 액션
  open: (view?: SavedViewRow) => void;
  close: () => void;
  setField: <K extends keyof ViewEditorFormFields>(key: K, value: ViewEditorFormFields[K]) => void;
  setFilterField: (key: string, value: unknown) => void;
  removeFilterField: (key: string) => void;
  setLayoutField: (path: string, value: unknown) => void;
  resetLayoutConfig: () => void;
  setSchemaField: (viewField: string, dataField: string) => void;
  removeSchemaField: (viewField: string) => void;
  setSaving: (saving: boolean) => void;
  reset: () => void;
  // 뷰 편집기 전용 액션
  setDomain: (domain: string) => void;
  addFilterRule: () => void;
  updateFilterRule: (idx: number, partial: Partial<FilterRule>) => void;
  removeFilterRule: (idx: number) => void;
  setGroupBy: (field: string) => void;
  setSort: (field: string, dir: 'asc' | 'desc') => void;
  setRange: (range: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all') => void;
  applyOrbConfig: (config: OrbViewConfig) => void;
  toSavePayload: () => {
    name: string;
    view_type: string;
    icon: string;
    description: string;
    filter_config: Record<string, unknown>;
    layout_config: LayoutConfig;
    schema_map: Record<string, string>;
    visibility: 'private' | 'link' | 'public';
    is_default: boolean;
    custom_code: string;
  };
}

type ViewEditorFormFields = Pick<
  ViewEditorState,
  'name' | 'viewType' | 'icon' | 'description' | 'visibility' | 'isDefault' | 'customCode'
>;

const INITIAL_FORM = {
  name: '',
  viewType: '',
  icon: '',
  description: '',
  filterConfig: {} as Record<string, unknown>,
  layoutConfig: {} as LayoutConfig,
  schemaMap: {} as Record<string, string>,
  visibility: 'private' as const,
  isDefault: false,
  customCode: '',
  isDirty: false,
  saving: false,
  domain: '',
  filterRules: [] as FilterRule[],
  groupBy: '',
  sortField: '',
  sortDir: 'asc' as const,
  range: 'all' as const,
};

function parseFilterConfig(fc: Record<string, unknown>) {
  return {
    domain: (fc.domain as string) ?? '',
    filterRules: (fc.filters as FilterRule[]) ?? [],
    groupBy: (fc.groupBy as string) ?? '',
    sortField: ((fc.sort as { field?: string })?.field) ?? '',
    sortDir: ((fc.sort as { dir?: 'asc' | 'desc' })?.dir) ?? 'asc' as const,
    range: (fc.range as 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all') ?? 'all',
  };
}

export const useViewEditorStore = create<ViewEditorState>((set, get) => ({
  isOpen: false,
  editingView: null,
  ...INITIAL_FORM,

  open: (view) => {
    if (view) {
      const fc = (view.filter_config as Record<string, unknown>) ?? {};
      set({
        isOpen: true,
        editingView: view,
        name: view.name,
        viewType: view.view_type,
        icon: view.icon ?? '',
        description: view.description ?? '',
        filterConfig: fc,
        layoutConfig: (view.layout_config as LayoutConfig) ?? {},
        schemaMap: (view.schema_map as Record<string, string>) ?? {},
        visibility: view.visibility ?? 'private',
        isDefault: view.is_default ?? false,
        customCode: view.custom_code ?? '',
        isDirty: false,
        ...parseFilterConfig(fc),
      });
    } else {
      set({
        isOpen: true,
        editingView: null,
        ...INITIAL_FORM,
      });
    }
  },

  close: () => set({ isOpen: false, editingView: null, ...INITIAL_FORM }),

  setField: (key, value) => set((s) => ({ ...s, [key]: value, isDirty: true })),

  setFilterField: (key, value) => set((s) => ({
    filterConfig: { ...s.filterConfig, [key]: value },
    isDirty: true,
  })),

  removeFilterField: (key) => set((s) => {
    const next = { ...s.filterConfig };
    delete next[key];
    return { filterConfig: next, isDirty: true };
  }),

  setLayoutField: (path, value) => set((s) => ({
    layoutConfig: setNested(s.layoutConfig as Record<string, unknown>, path, value) as LayoutConfig,
    isDirty: true,
  })),

  resetLayoutConfig: () => set({ layoutConfig: {} as LayoutConfig, isDirty: true }),

  setSchemaField: (viewField, dataField) => set((s) => ({
    schemaMap: { ...s.schemaMap, [viewField]: dataField },
    isDirty: true,
  })),

  removeSchemaField: (viewField) => set((s) => {
    const next = { ...s.schemaMap };
    delete next[viewField];
    return { schemaMap: next, isDirty: true };
  }),

  setSaving: (saving) => set({ saving }),

  reset: () => set({ ...INITIAL_FORM, isOpen: false, editingView: null }),

  // 뷰 편집기 전용 액션
  setDomain: (domain) => set((s) => ({
    domain,
    filterConfig: { ...s.filterConfig, domain },
    isDirty: true,
  })),

  addFilterRule: () => set((s) => {
    const newRule: FilterRule = { field: '', op: '=', value: '' };
    const filterRules = [...s.filterRules, newRule];
    return {
      filterRules,
      filterConfig: { ...s.filterConfig, filters: filterRules },
      isDirty: true,
    };
  }),

  updateFilterRule: (idx, partial) => set((s) => {
    const filterRules = s.filterRules.map((r, i) => i === idx ? { ...r, ...partial } : r);
    return {
      filterRules,
      filterConfig: { ...s.filterConfig, filters: filterRules },
      isDirty: true,
    };
  }),

  removeFilterRule: (idx) => set((s) => {
    const filterRules = s.filterRules.filter((_, i) => i !== idx);
    return {
      filterRules,
      filterConfig: { ...s.filterConfig, filters: filterRules },
      isDirty: true,
    };
  }),

  setGroupBy: (field) => set((s) => ({
    groupBy: field,
    filterConfig: { ...s.filterConfig, groupBy: field },
    isDirty: true,
  })),

  setSort: (field, dir) => set((s) => ({
    sortField: field,
    sortDir: dir,
    filterConfig: { ...s.filterConfig, sort: { field, dir } },
    isDirty: true,
  })),

  setRange: (range) => set((s) => ({
    range,
    filterConfig: { ...s.filterConfig, range },
    isDirty: true,
  })),

  applyOrbConfig: (config) => set((s) => {
    const domain = config.domain ?? s.domain;
    const viewType = config.viewType ?? s.viewType;
    const filterRules = config.filters ?? s.filterRules;
    const groupBy = config.groupBy ?? s.groupBy;
    const sortField = config.sort?.field ?? s.sortField;
    const sortDir = config.sort?.dir ?? s.sortDir;
    const range = config.range ?? s.range;

    const filterConfig: Record<string, unknown> = {
      ...s.filterConfig,
      domain,
      filters: filterRules,
      groupBy,
      sort: sortField ? { field: sortField, dir: sortDir } : s.filterConfig.sort,
      range,
    };

    return {
      domain,
      viewType,
      filterRules,
      groupBy,
      sortField,
      sortDir,
      range,
      filterConfig,
      isDirty: true,
    };
  }),

  toSavePayload: () => {
    const s = get();
    return {
      name: s.name,
      view_type: s.viewType,
      icon: s.icon,
      description: s.description,
      filter_config: s.filterConfig,
      layout_config: s.layoutConfig,
      schema_map: s.schemaMap,
      visibility: s.visibility,
      is_default: s.isDefault,
      custom_code: s.customCode,
    };
  },
}));
