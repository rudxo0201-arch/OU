import { create } from 'zustand';

export type HomeView = 'dashboard' | 'graph' | 'page';

interface HomeViewState {
  activeView: HomeView;
  setView: (view: HomeView) => void;
  toggleView: (view: HomeView) => void;
}

export const useHomeViewStore = create<HomeViewState>((set, get) => ({
  activeView: 'dashboard',
  setView: (view) => set({ activeView: view }),
  toggleView: (view) => set({ activeView: get().activeView === view ? 'dashboard' : view }),
}));
