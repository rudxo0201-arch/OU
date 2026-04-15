import { create } from 'zustand';

export interface OpenFile {
  path: string;
  language: string;
}

export interface TerminalEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timestamp: string;
}

export interface GitChange {
  staged: string;
  unstaged: string;
  path: string;
}

export interface GitLogEntry {
  hash: string;
  message: string;
}

interface DevWorkspaceStore {
  // 프로젝트 상태
  projectId: string | null;
  projectName: string;
  isAdminMode: boolean;
  setProject: (id: string, name: string) => void;
  clearProject: () => void;
  setAdminMode: (mode: boolean) => void;

  // 파일 상태
  activeFilePath: string | null;
  openFiles: OpenFile[];
  selectedText: string;
  setActiveFilePath: (path: string | null) => void;
  addOpenFile: (file: OpenFile) => void;
  removeOpenFile: (path: string) => void;
  setSelectedText: (text: string) => void;

  // 터미널 상태
  terminalOutput: TerminalEntry[];
  appendTerminalOutput: (entry: TerminalEntry) => void;
  clearTerminalOutput: () => void;

  // 에러 상태
  currentErrors: string[];
  setCurrentErrors: (errors: string[]) => void;

  // Git 상태
  gitBranch: string;
  gitChanges: GitChange[];
  gitLog: GitLogEntry[];
  gitLoading: boolean;
  refreshGitStatus: () => Promise<void>;
}

export const useDevWorkspaceStore = create<DevWorkspaceStore>()(set => ({
  // 프로젝트 초기값
  projectId: null,
  projectName: '',
  isAdminMode: false,

  activeFilePath: null,
  openFiles: [],
  selectedText: '',
  terminalOutput: [],
  currentErrors: [],

  // Git 초기값
  gitBranch: '',
  gitChanges: [],
  gitLog: [],
  gitLoading: false,

  setProject: (id, name) => set({
    projectId: id,
    projectName: name,
    // 프로젝트 전환 시 파일 상태 초기화
    activeFilePath: null,
    openFiles: [],
    selectedText: '',
    terminalOutput: [],
    currentErrors: [],
    gitBranch: '',
    gitChanges: [],
    gitLog: [],
  }),

  clearProject: () => set({
    projectId: null,
    projectName: '',
    activeFilePath: null,
    openFiles: [],
    selectedText: '',
    terminalOutput: [],
    currentErrors: [],
  }),

  setAdminMode: (mode) => set({ isAdminMode: mode }),

  setActiveFilePath: (path) => set({ activeFilePath: path }),

  addOpenFile: (file) => set(s => {
    if (s.openFiles.some(f => f.path === file.path)) return s;
    return { openFiles: [...s.openFiles, file] };
  }),

  removeOpenFile: (path) => set(s => ({
    openFiles: s.openFiles.filter(f => f.path !== path),
    activeFilePath: s.activeFilePath === path
      ? (s.openFiles.find(f => f.path !== path)?.path ?? null)
      : s.activeFilePath,
  })),

  setSelectedText: (text) => set({ selectedText: text }),

  appendTerminalOutput: (entry) => set(s => ({
    terminalOutput: [...s.terminalOutput.slice(-99), entry],
  })),

  clearTerminalOutput: () => set({ terminalOutput: [] }),

  setCurrentErrors: (errors) => set({ currentErrors: errors }),

  refreshGitStatus: async () => {
    set({ gitLoading: true });
    try {
      const res = await fetch('/api/dev/git');
      if (!res.ok) throw new Error('Git status fetch failed');
      const data = await res.json();
      set({
        gitBranch: data.branch || '',
        gitChanges: data.changes || [],
        gitLog: data.log || [],
        gitLoading: false,
      });
    } catch {
      set({ gitLoading: false });
    }
  },
}));
