import { create } from 'zustand';
import type { SavedViewRow } from '@/types/admin';
import type { LayoutConfig } from '@/types/layout-config';

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
};

export const useViewEditorStore = create<ViewEditorState>((set) => ({
  isOpen: false,
  editingView: null,
  ...INITIAL_FORM,

  open: (view) => {
    if (view) {
      set({
        isOpen: true,
        editingView: view,
        name: view.name,
        viewType: view.view_type,
        icon: view.icon ?? '',
        description: view.description ?? '',
        filterConfig: (view.filter_config as Record<string, unknown>) ?? {},
        layoutConfig: (view.layout_config as LayoutConfig) ?? {},
        schemaMap: (view.schema_map as Record<string, string>) ?? {},
        visibility: view.visibility ?? 'private',
        isDefault: view.is_default ?? false,
        customCode: view.custom_code ?? '',
        isDirty: false,
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
}));
