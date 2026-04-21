import { create } from 'zustand';

export type NoteMeta = {
  id: string;
  title: string;
  parent_page_id: string | null;
  updated_at: string;
};

type NoteNode = NoteMeta & { children: NoteNode[] };

interface NoteStore {
  pages: NoteMeta[];
  activePageId: string | null;
  sidebarOpen: boolean;
  loading: boolean;

  // 페이지 트리 (parent_page_id 기반으로 빌드)
  tree: NoteNode[];

  fetchPages: () => Promise<void>;
  setActivePageId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;

  createPage: (title?: string, parentId?: string | null) => Promise<string | null>;
  deletePage: (id: string) => Promise<void>;
  updatePageTitle: (id: string, title: string) => void; // 낙관적
}

function buildTree(pages: NoteMeta[]): NoteNode[] {
  const map = new Map<string, NoteNode>();
  pages.forEach((p) => map.set(p.id, { ...p, children: [] }));

  const roots: NoteNode[] = [];
  map.forEach((node) => {
    if (node.parent_page_id && map.has(node.parent_page_id)) {
      map.get(node.parent_page_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  pages: [],
  activePageId: null,
  sidebarOpen: true,
  loading: false,
  tree: [],

  fetchPages: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) return;
      const data = await res.json();
      const pages: NoteMeta[] = (data.notes ?? []).map((n: {
        id: string;
        domain_data?: { title?: string; parent_page_id?: string | null };
        updated_at: string;
      }) => ({
        id: n.id,
        title: n.domain_data?.title ?? '',
        parent_page_id: n.domain_data?.parent_page_id ?? null,
        updated_at: n.updated_at,
      }));
      set({ pages, tree: buildTree(pages) });
    } finally {
      set({ loading: false });
    }
  },

  setActivePageId: (id) => set({ activePageId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  createPage: async (title = '', parentId = null) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, parent_page_id: parentId }),
      });
      if (!res.ok) return null;
      const { id } = await res.json();

      const newPage: NoteMeta = {
        id,
        title,
        parent_page_id: parentId,
        updated_at: new Date().toISOString(),
      };
      const pages = [newPage, ...get().pages];
      set({ pages, tree: buildTree(pages) });
      return id;
    } catch {
      return null;
    }
  },

  deletePage: async (id) => {
    try {
      await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    const pages = get().pages.filter((p) => p.id !== id);
    set({ pages, tree: buildTree(pages) });
  },

  updatePageTitle: (id, title) => {
    const pages = get().pages.map((p) => (p.id === id ? { ...p, title } : p));
    set({ pages, tree: buildTree(pages) });
  },
}));
