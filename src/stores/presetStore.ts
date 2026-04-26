import { create } from 'zustand';
import type { Preset, ForceParams } from '@/types';

const DEFAULT_FORCE: ForceParams = {
  gravity: -300,
  linkDistance: 80,
  nodeSize: 6,
  linkStrength: 0.3,
};

interface PresetState {
  presets: Preset[];
  loaded: boolean;
  forceParams: ForceParams;

  setPresets: (presets: Preset[]) => void;
  addPreset: (p: Omit<Preset, 'id' | 'createdAt'>) => void;
  updatePreset: (id: string, patch: Partial<Preset>) => void;
  removePreset: (id: string) => void;
  setForceParams: (params: Partial<ForceParams>) => void;
  markLoaded: () => void;
}

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const usePresetStore = create<PresetState>((set) => ({
  presets: [],
  loaded: false,
  forceParams: DEFAULT_FORCE,

  setPresets: (presets) => set({ presets }),
  markLoaded: () => set({ loaded: true }),

  addPreset: (p) =>
    set((s) => ({
      presets: [
        ...s.presets,
        { ...p, id: genId(), createdAt: new Date().toISOString(), position: s.presets.length },
      ],
    })),

  updatePreset: (id, patch) =>
    set((s) => ({
      presets: s.presets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  removePreset: (id) =>
    set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),

  setForceParams: (params) =>
    set((s) => ({ forceParams: { ...s.forceParams, ...params } })),
}));
