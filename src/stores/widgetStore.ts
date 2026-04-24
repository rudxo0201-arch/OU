import { createSafeStore } from '@/lib/createSafeStore';

// ── 타입 (위젯 컴포넌트 재구축 전 임시 인라인) ──
export interface WidgetInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  [key: string]: unknown;
}

export const GRID_COLS = 16;
export const GRID_ROWS = 9;

export const GRID_PRESETS = [
  { label: '크게',   cols: 10, rows: 6  },
  { label: '기본',   cols: 16, rows: 9  },
  { label: '촘촘히', cols: 20, rows: 12 },
] as const;

const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: 'default-qsbar',    type: 'qsbar',         x: 4,  y: 3, w: 8, h: 2 },
  { id: 'default-schedule', type: 'today-schedule', x: 11, y: 0, w: 5, h: 6 },
];
const DEFAULT_PAGE2_LAYOUT: WidgetInstance[] = [];
const ADMIN_LAYOUT: WidgetInstance[] = [];
const ADMIN_PAGE2_LAYOUT: WidgetInstance[] = [];

const LAYOUT_VERSION = 11;

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
  widgets: WidgetInstance[];
  setCurrentPage: (index: number) => void;
  setGridSize: (cols: number, rows: number) => void;
  addPage: (name?: string) => void;
  removePage: (index: number) => void;
  renamePage: (index: number, name: string) => void;
  initAdminLayout: () => void;
  setPages: (pages: WidgetPage[]) => void;
  setWidgets: (widgets: WidgetInstance[]) => void;
  updateLayout: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  addWidget: (widget: WidgetInstance) => void;
  removeWidget: (id: string) => void;
  resetLayout: () => void;
}

function clampToGrid(widgets: WidgetInstance[], cols = GRID_COLS, rows = GRID_ROWS): WidgetInstance[] {
  return widgets.map(w => ({
    ...w,
    x: Math.max(0, Math.min(w.x, cols - 1)),
    y: Math.max(0, Math.min(w.y, rows - 1)),
    w: Math.max(1, Math.min(w.w, cols - Math.max(0, w.x))),
    h: Math.max(1, Math.min(w.h, rows - Math.max(0, w.y))),
  }));
}

function findFreePosition(existing: WidgetInstance[], w: number, h: number, cols: number, rows: number) {
  const occupied = new Set<string>();
  for (const widget of existing) {
    for (let dy = 0; dy < widget.h; dy++)
      for (let dx = 0; dx < widget.w; dx++)
        occupied.add(`${widget.x + dx},${widget.y + dy}`);
  }
  for (let y = 0; y <= rows - h; y++) {
    for (let x = 0; x <= cols - w; x++) {
      let fits = true;
      outer: for (let dy = 0; dy < h; dy++)
        for (let dx = 0; dx < w; dx++)
          if (occupied.has(`${x + dx},${y + dy}`)) { fits = false; break outer; }
      if (fits) return { x, y };
    }
  }
  return null;
}

const DEFAULT_PAGES: WidgetPage[] = [
  { id: 'main', name: '홈', widgets: DEFAULT_LAYOUT },
  { id: 'page2', name: '기억 · 활동', widgets: DEFAULT_PAGE2_LAYOUT },
];

export const useWidgetStore = createSafeStore<WidgetStore>(
  (set, get) => ({
    pages: DEFAULT_PAGES,
    currentPageIndex: 0,
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,

    get widgets(): WidgetInstance[] {
      const state = get();
      return state.pages[state.currentPageIndex]?.widgets ?? [];
    },

    setGridSize: (cols, rows) => set((s) => ({
      gridCols: cols,
      gridRows: rows,
      pages: s.pages.map(page => ({ ...page, widgets: clampToGrid(page.widgets, cols, rows) })),
    })),

    initAdminLayout: () => set((s) => {
      const pages = s.pages.map(page => ({ ...page, name: 'Dashboard' }));
      pages[0] = { ...pages[0], widgets: clampToGrid(ADMIN_LAYOUT, s.gridCols, s.gridRows) };
      if (pages[1]) pages[1] = { ...pages[1], widgets: clampToGrid(ADMIN_PAGE2_LAYOUT, s.gridCols, s.gridRows) };
      return { pages, currentPageIndex: 0 };
    }),

    setCurrentPage: (index) => set({ currentPageIndex: Math.max(0, Math.min(index, get().pages.length - 1)) }),

    addPage: (name) => set((s) => ({
      pages: [...s.pages, { id: `page-${Date.now()}`, name: name || `페이지 ${s.pages.length + 1}`, widgets: [] }],
    })),

    renamePage: (index, name) => set((s) => {
      const pages = [...s.pages];
      if (pages[index]) pages[index] = { ...pages[index], name };
      return { pages };
    }),

    removePage: (index) => set((s) => {
      if (s.pages.length <= 1 || index === 0) return s;
      const newPages = s.pages.filter((_, i) => i !== index);
      return { pages: newPages, currentPageIndex: Math.min(s.currentPageIndex, newPages.length - 1) };
    }),

    setPages: (pages) => set({ pages }),

    setWidgets: (widgets) => set((s) => {
      const pages = [...s.pages];
      pages[s.currentPageIndex] = { ...pages[s.currentPageIndex], widgets: clampToGrid(widgets, s.gridCols, s.gridRows) };
      return { pages };
    }),

    updateLayout: (layouts) => set((s) => {
      const pages = [...s.pages];
      const page = pages[s.currentPageIndex];
      pages[s.currentPageIndex] = {
        ...page,
        widgets: page.widgets.map(w => {
          const l = layouts.find(l => l.i === w.id);
          return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
        }),
      };
      return { pages };
    }),

    addWidget: (widget) => set((s) => {
      const pages = [...s.pages];
      const pageIdx = s.currentPageIndex;
      const page = pages[pageIdx];
      const w = Math.min(widget.w, s.gridCols);
      const h = Math.min(widget.h, s.gridRows);
      const pos = findFreePosition(page.widgets, w, h, s.gridCols, s.gridRows);
      if (pos) {
        pages[pageIdx] = { ...page, widgets: [...page.widgets, { ...widget, x: pos.x, y: pos.y, w, h }] };
        return { pages };
      }
      const newPage: WidgetPage = { id: `page-${Date.now()}`, name: `페이지 ${pages.length + 1}`, widgets: [{ ...widget, x: 0, y: 0, w, h }] };
      return { pages: [...pages, newPage], currentPageIndex: pages.length };
    }),

    removeWidget: (id) => set((s) => {
      const pages = [...s.pages];
      const page = pages[s.currentPageIndex];
      pages[s.currentPageIndex] = { ...page, widgets: page.widgets.filter(w => w.id !== id) };
      return { pages };
    }),

    resetLayout: () => set({ pages: DEFAULT_PAGES, currentPageIndex: 0 }),
  }),
  {
    name: 'ou-widget-layout',
    version: LAYOUT_VERSION,
    migrate: (persisted: unknown) => {
      const p = persisted as Record<string, unknown> | null;
      if (p?.pages && Array.isArray(p.pages) && p.pages.length) {
        return { pages: p.pages, currentPageIndex: p.currentPageIndex ?? 0, gridCols: p.gridCols, gridRows: p.gridRows };
      }
      return { pages: DEFAULT_PAGES, currentPageIndex: 0 };
    },
    merge: (persisted: unknown, current: unknown) => {
      const state = { ...(current as object), ...(persisted as object) } as Record<string, unknown>;
      if (!state.pages || !Array.isArray(state.pages) || (state.pages as unknown[]).length === 0) {
        state.pages = DEFAULT_PAGES;
        state.currentPageIndex = 0;
      }
      return state;
    },
  },
);
