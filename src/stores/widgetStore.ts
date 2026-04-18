import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WidgetInstance } from '@/components/widgets/types';
import { GRID_COLS, GRID_ROWS } from '@/components/widgets/types';
import { DEFAULT_LAYOUT } from '@/components/widgets/presets';

const LAYOUT_VERSION = 4;

export interface WidgetPage {
  id: string;
  name: string;
  widgets: WidgetInstance[];
}

interface WidgetStore {
  pages: WidgetPage[];
  currentPageIndex: number;
  gridCols: number;
  gridRows: number;

  // Current page helpers
  widgets: WidgetInstance[];
  setCurrentPage: (index: number) => void;
  setGridSize: (cols: number, rows: number) => void;
  addPage: (name?: string) => void;
  removePage: (index: number) => void;

  // Widget operations (on current page)
  setWidgets: (widgets: WidgetInstance[]) => void;
  updateLayout: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  addWidget: (widget: WidgetInstance) => void;
  removeWidget: (id: string) => void;
  resetLayout: () => void;
}

function clampToGrid(widgets: WidgetInstance[]): WidgetInstance[] {
  return widgets.map(w => ({
    ...w,
    x: Math.max(0, Math.min(w.x, GRID_COLS - 1)),
    y: Math.max(0, Math.min(w.y, GRID_ROWS - 1)),
    w: Math.min(w.w, GRID_COLS - Math.max(0, w.x)),
    h: Math.min(w.h, GRID_ROWS - Math.max(0, w.y)),
  }));
}

const DEFAULT_PAGES: WidgetPage[] = [
  { id: 'main', name: '메인', widgets: DEFAULT_LAYOUT },
  { id: 'page2', name: '페이지 2', widgets: [] },
  { id: 'page3', name: '페이지 3', widgets: [] },
];

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      pages: DEFAULT_PAGES,
      currentPageIndex: 0,
      gridCols: GRID_COLS,
      gridRows: GRID_ROWS,

      setGridSize: (cols, rows) => set({ gridCols: cols, gridRows: rows }),

      // Note: use selector `s => s.pages[s.currentPageIndex]?.widgets` for current widgets
      // This getter is for backward compat with destructuring `{ widgets }`
      get widgets(): WidgetInstance[] {
        const state = get();
        return state.pages[state.currentPageIndex]?.widgets ?? [];
      },

      setCurrentPage: (index) => set({ currentPageIndex: Math.max(0, Math.min(index, get().pages.length - 1)) }),

      addPage: (name) => set((s) => ({
        pages: [...s.pages, {
          id: `page-${Date.now()}`,
          name: name || `페이지 ${s.pages.length + 1}`,
          widgets: [],
        }],
      })),

      removePage: (index) => set((s) => {
        if (s.pages.length <= 1) return s; // can't remove last page
        if (index === 0) return s; // can't remove main page
        const newPages = s.pages.filter((_, i) => i !== index);
        return {
          pages: newPages,
          currentPageIndex: Math.min(s.currentPageIndex, newPages.length - 1),
        };
      }),

      setWidgets: (widgets) => set((s) => {
        const pages = [...s.pages];
        pages[s.currentPageIndex] = { ...pages[s.currentPageIndex], widgets: clampToGrid(widgets) };
        return { pages };
      }),

      updateLayout: (layouts) => set((s) => {
        const pages = [...s.pages];
        const page = pages[s.currentPageIndex];
        pages[s.currentPageIndex] = {
          ...page,
          widgets: page.widgets.map(w => {
            const l = layouts.find(l => l.i === w.id);
            if (!l) return w;
            return { ...w, x: l.x, y: l.y, w: l.w, h: l.h };
          }),
        };
        return { pages };
      }),

      addWidget: (widget) => set((s) => {
        const pages = [...s.pages];
        const page = pages[s.currentPageIndex];
        pages[s.currentPageIndex] = {
          ...page,
          widgets: clampToGrid([...page.widgets, widget]),
        };
        return { pages };
      }),

      removeWidget: (id) => set((s) => {
        const pages = [...s.pages];
        const page = pages[s.currentPageIndex];
        pages[s.currentPageIndex] = {
          ...page,
          widgets: page.widgets.filter(w => w.id !== id),
        };
        return { pages };
      }),

      resetLayout: () => set({ pages: DEFAULT_PAGES, currentPageIndex: 0 }),
    }),
    {
      name: 'ou-widget-layout',
      version: LAYOUT_VERSION,
      migrate: () => ({
        pages: DEFAULT_PAGES,
        currentPageIndex: 0,
      }),
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as object) };
        if (!state.pages || !Array.isArray(state.pages) || state.pages.length === 0) {
          state.pages = DEFAULT_PAGES;
          state.currentPageIndex = 0;
        }
        return state;
      },
    },
  ),
);
