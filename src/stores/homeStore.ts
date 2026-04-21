import { createSafeStore } from '@/lib/createSafeStore';

export type GridItem = {
  id: string;
  type: 'app' | 'qsd';
  slug?: string;  // type=app일 때 앱 slug
  col: number;    // 0-based
  row: number;    // 0-based
};

type HomeState = {
  gridItems: GridItem[];
  dockSlugs: string[];
  addToGrid: (type: GridItem['type'], col: number, row: number, slug?: string) => void;
  removeFromGrid: (id: string) => void;
  moveOnGrid: (id: string, col: number, row: number) => void;
  addToDock: (slug: string) => void;
  removeFromDock: (slug: string) => void;
  reorderDock: (slugs: string[]) => void;
  findFreeCell: () => { col: number; row: number } | null;
};

// 기본 레이아웃: QSD (행0, 전체 너비로 논리상 col=0) + 6앱 아이콘 (2행 × 3열)
const DEFAULT_GRID_ITEMS: GridItem[] = [
  { id: 'qsd-default', type: 'qsd', col: 0, row: 0 },
  { id: 'app-note',     type: 'app', slug: 'note',     col: 0, row: 1 },
  { id: 'app-calendar', type: 'app', slug: 'calendar', col: 1, row: 1 },
  { id: 'app-todo',     type: 'app', slug: 'todo',     col: 2, row: 1 },
  { id: 'app-finance',  type: 'app', slug: 'finance',  col: 3, row: 1 },
  { id: 'app-habit',    type: 'app', slug: 'habit',    col: 4, row: 1 },
  { id: 'app-idea',     type: 'app', slug: 'idea',     col: 5, row: 1 },
];

const DEFAULT_DOCK_SLUGS = ['note', 'calendar', 'todo', 'finance', 'habit', 'idea'];

const GRID_COLS = 6;

export const useHomeStore = createSafeStore<HomeState>(
  (set, get) => ({
    gridItems: DEFAULT_GRID_ITEMS,
    dockSlugs: DEFAULT_DOCK_SLUGS,

    addToGrid: (type, col, row, slug) => {
      const id = `${type}-${slug ?? 'qsd'}-${Date.now()}`;
      set(s => ({ ...s, gridItems: [...s.gridItems, { id, type, slug, col, row }] }));
    },

    removeFromGrid: (id) => {
      set(s => ({ ...s, gridItems: s.gridItems.filter(item => item.id !== id) }));
    },

    moveOnGrid: (id, col, row) => {
      set(s => ({
        ...s,
        gridItems: s.gridItems.map(item => item.id === id ? { ...item, col, row } : item),
      }));
    },

    addToDock: (slug) => {
      set(s => {
        if (s.dockSlugs.includes(slug)) return s;
        return { ...s, dockSlugs: [...s.dockSlugs, slug] };
      });
    },

    removeFromDock: (slug) => {
      set(s => ({ ...s, dockSlugs: s.dockSlugs.filter(sl => sl !== slug) }));
    },

    reorderDock: (slugs) => {
      set(s => ({ ...s, dockSlugs: slugs }));
    },

    findFreeCell: () => {
      const { gridItems } = get();
      const occupied = new Set(gridItems.map(item => `${item.col},${item.row}`));
      for (let row = 0; row < 20; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          if (!occupied.has(`${col},${row}`)) return { col, row };
        }
      }
      return null;
    },
  }),
  {
    name: 'ou-home-layout',
    merge: (persisted: any, current: any) => {
      const merged = { ...current, ...persisted };
      // QSD가 없으면 기본 위치(row 0)에 복구
      const hasQSD = merged.gridItems?.some((i: GridItem) => i.type === 'qsd');
      if (!hasQSD) {
        merged.gridItems = [
          { id: 'qsd-default', type: 'qsd', col: 0, row: 0 },
          ...(merged.gridItems ?? []),
        ];
      }
      return merged;
    },
  },
);
