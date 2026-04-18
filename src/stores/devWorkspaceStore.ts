import { create } from 'zustand';

// Type stubs for lib/dev references
export interface GitChange {
  staged: string;
  unstaged: string;
  path: string;
}

export interface GitLogEntry {
  hash: string;
  message: string;
}

interface DevWorkspaceState {
  previewUrl: string | null;
  setPreviewUrl: (url: string) => void;
}

export const useDevWorkspaceStore = create<DevWorkspaceState>((set) => ({
  previewUrl: null,
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
}));
