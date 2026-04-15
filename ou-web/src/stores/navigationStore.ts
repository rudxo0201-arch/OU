import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedView {
  id: string;
  name: string;
  icon?: string;
  viewType: string;
}

interface NavigationStore {
  collapsed: boolean;
  savedViews: SavedView[];
  toggleCollapsed: () => void;
  addSavedView: (view: SavedView) => void;
  removeSavedView: (id: string) => void;
  renameSavedView: (id: string, name: string) => void;
  setSavedViews: (views: SavedView[]) => void;
}

export const useNavigationStore = create<NavigationStore>()(
  persist(
    set => ({
      collapsed: false,
      savedViews: [],
      toggleCollapsed: () => set(s => ({ collapsed: !s.collapsed })),
      addSavedView: view =>
        set(s => ({ savedViews: [...s.savedViews, view] })),
      removeSavedView: id =>
        set(s => ({ savedViews: s.savedViews.filter(v => v.id !== id) })),
      renameSavedView: (id, name) =>
        set(s => ({
          savedViews: s.savedViews.map(v => v.id === id ? { ...v, name } : v),
        })),
      setSavedViews: views => set({ savedViews: views }),
    }),
    { name: 'ou-navigation' }
  )
);
