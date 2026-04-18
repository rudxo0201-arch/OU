import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Universe, UniverseItem, DataView, ItemType } from '@/types/universe';
import * as api from '@/lib/supabase-universe';

interface UniverseState {
  // State
  universe: Universe | null;
  items: UniverseItem[];
  dataViews: DataView[];
  isLoading: boolean;
  activeViewId: string | null;
  _initialized: boolean;

  // Universe
  loadMyUniverse: (userId: string) => Promise<void>;
  ensureUniverse: (userId: string) => Promise<Universe>;
  reset: () => void;

  // Items
  addItem: (item: { id?: string; type: ItemType; ref_id?: string | null; label: string; data?: Record<string, any> }) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  hasItem: (refId: string) => boolean;

  // Data Views
  addDataView: (view: Pick<DataView, 'name' | 'type' | 'config' | 'icon'>) => Promise<void>;
  updateDataView: (id: string, updates: Partial<Pick<DataView, 'name' | 'config' | 'pinned' | 'sort_order'>>) => Promise<void>;
  removeDataView: (id: string) => Promise<void>;
  setActiveView: (id: string | null) => void;

  // Compat: count getter
  count: number;
}

export const useUniverseStore = create<UniverseState>()(
  persist(
    (set, get) => ({
      universe: null,
      items: [],
      dataViews: [],
      isLoading: false,
      activeViewId: null,
      _initialized: false,
      count: 0,

      loadMyUniverse: async (userId: string) => {
        if (get()._initialized && get().universe?.user_id === userId) return;
        set({ isLoading: true });
        try {
          let universe = await api.getMyUniverse(userId);
          if (!universe) {
            universe = await api.createUniverse(userId);
          }
          const [items, dataViews] = await Promise.all([
            api.getUniverseItems(universe.id),
            api.getDataViews(universe.id),
          ]);
          set({
            universe,
            items,
            dataViews,
            count: items.length,
            isLoading: false,
            _initialized: true,
          });
        } catch (err) {
          // Supabase 테이블 미생성 등 — 빈 유니버스로 fallback
          console.warn('Universe load failed (tables may not exist yet):', err);
          set({
            universe: { id: 'local', user_id: userId, name: 'My Universe', description: null, is_public: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            items: [],
            dataViews: [],
            count: 0,
            isLoading: false,
            _initialized: true,
          });
        }
      },

      ensureUniverse: async (userId: string) => {
        const existing = get().universe;
        if (existing) return existing;
        await get().loadMyUniverse(userId);
        return get().universe!;
      },

      reset: () => set({
        universe: null,
        items: [],
        dataViews: [],
        isLoading: false,
        activeViewId: null,
        _initialized: false,
        count: 0,
      }),

      // === Items ===
      addItem: async (item) => {
        const universe = get().universe;
        if (!universe) return;

        const refId = item.ref_id ?? item.id ?? item.label;
        if (get().hasItem(refId)) return;

        try {
          const created = await api.addUniverseItem(universe.id, {
            type: item.type,
            ref_id: refId,
            label: item.label,
            data: item.data || {},
          });
          set(state => ({
            items: [created, ...state.items],
            count: state.items.length + 1,
          }));
        } catch (err) {
          console.error('Failed to add item:', err);
        }
      },

      removeItem: async (id: string) => {
        try {
          await api.removeUniverseItem(id);
          set(state => ({
            items: state.items.filter(i => i.id !== id),
            count: Math.max(0, state.items.length - 1),
          }));
        } catch (err) {
          console.error('Failed to remove item:', err);
        }
      },

      hasItem: (refId: string) => {
        return get().items.some(i => i.ref_id === refId || i.id === refId);
      },

      // === Data Views ===
      addDataView: async (view) => {
        const universe = get().universe;
        if (!universe) return;
        try {
          const created = await api.addDataView(universe.id, view);
          set(state => ({ dataViews: [...state.dataViews, created] }));
        } catch (err) {
          console.error('Failed to add data view:', err);
        }
      },

      updateDataView: async (id, updates) => {
        try {
          await api.updateDataView(id, updates);
          set(state => ({
            dataViews: state.dataViews.map(v => v.id === id ? { ...v, ...updates } : v),
          }));
        } catch (err) {
          console.error('Failed to update data view:', err);
        }
      },

      removeDataView: async (id) => {
        try {
          await api.removeDataView(id);
          set(state => ({
            dataViews: state.dataViews.filter(v => v.id !== id),
            activeViewId: state.activeViewId === id ? null : state.activeViewId,
          }));
        } catch (err) {
          console.error('Failed to remove data view:', err);
        }
      },

      setActiveView: (id) => set({ activeViewId: id }),
    }),
    {
      name: 'ou-universe',
      partialize: (state) => ({
        // Only persist minimal data for offline fallback
        items: state.items,
        count: state.count,
      }),
    }
  )
);

// Re-export type for backward compatibility
export type { UniverseItem } from '@/types/universe';
