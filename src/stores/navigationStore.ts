import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedView {
  id: string;
  name: string;
  icon?: string;
  viewType: string;
}

export interface DashboardLayoutItem {
  i: string;       // view id
  x: number;
  y: number;
  w: number;
  h: number;
}

interface NavigationStore {
  // Legacy (kept for backward compat during migration)
  collapsed: boolean;
  toggleCollapsed: () => void;

  // Views
  savedViews: SavedView[];
  addSavedView: (view: SavedView) => void;
  removeSavedView: (id: string) => void;
  renameSavedView: (id: string, name: string) => void;
  setSavedViews: (views: SavedView[]) => void;

  // Active fullscreen view
  activeViewId: string | null;
  setActiveViewId: (id: string | null) => void;

  // Chat panel
  chatPanelOpen: boolean;
  toggleChatPanel: () => void;
  setChatPanelOpen: (open: boolean) => void;

  // Dashboard layout (legacy, kept for compat)
  dashboardLayout: DashboardLayoutItem[];
  setDashboardLayout: (layout: DashboardLayoutItem[]) => void;

  // Orb Dock — pinned view shortcuts (right side, max 7)
  pinnedViewIds: string[];
  pinView: (viewId: string) => void;
  unpinView: (viewId: string) => void;
  reorderPinnedViews: (ids: string[]) => void;
}

export const useNavigationStore = create<NavigationStore>()(
  persist(
    set => ({
      collapsed: false,
      savedViews: [],
      activeViewId: null,
      chatPanelOpen: true,
      dashboardLayout: [],
      pinnedViewIds: [],

      toggleCollapsed: () => set(s => ({ collapsed: !s.collapsed })),

      addSavedView: view =>
        set(s => ({ savedViews: [...s.savedViews, view] })),
      removeSavedView: id =>
        set(s => ({
          savedViews: s.savedViews.filter(v => v.id !== id),
          pinnedViewIds: s.pinnedViewIds.filter(pid => pid !== id),
        })),
      renameSavedView: (id, name) =>
        set(s => ({
          savedViews: s.savedViews.map(v => v.id === id ? { ...v, name } : v),
        })),
      setSavedViews: views => set({ savedViews: views }),

      setActiveViewId: id => set({ activeViewId: id }),
      toggleChatPanel: () => set(s => ({ chatPanelOpen: !s.chatPanelOpen })),
      setChatPanelOpen: open => set({ chatPanelOpen: open }),
      setDashboardLayout: layout => set({ dashboardLayout: layout }),

      pinView: viewId => set(s => {
        if (s.pinnedViewIds.includes(viewId)) return s;
        const updated = [...s.pinnedViewIds, viewId].slice(-7); // max 7
        return { pinnedViewIds: updated };
      }),
      unpinView: viewId => set(s => ({
        pinnedViewIds: s.pinnedViewIds.filter(id => id !== viewId),
      })),
      reorderPinnedViews: ids => set({ pinnedViewIds: ids }),
    }),
    { name: 'ou-navigation' }
  )
);
