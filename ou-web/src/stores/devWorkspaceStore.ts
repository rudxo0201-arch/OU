import { create } from 'zustand';

export type WebContainerStatus = 'idle' | 'booting' | 'loading' | 'ready' | 'error';

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

  // WebContainer 상태
  webcontainerStatus: WebContainerStatus;
  webcontainerError: string | null;
  webcontainerInstance: any | null; // WebContainer type (dynamic import)
  setWebcontainerStatus: (status: WebContainerStatus, error?: string) => void;
  setWebcontainerInstance: (instance: any) => void;

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

  // 프리뷰 상태
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;

  // Git 상태
  gitBranch: string;
  gitChanges: GitChange[];
  gitLog: GitLogEntry[];
  gitLoading: boolean;
  refreshGitStatus: () => Promise<void>;
}

export const useDevWorkspaceStore = create<DevWorkspaceStore>()((set, get) => ({
  // 프로젝트 초기값
  projectId: null,
  projectName: '',
  isAdminMode: false,

  // WebContainer 초기값
  webcontainerStatus: 'idle' as WebContainerStatus,
  webcontainerError: null,
  webcontainerInstance: null,

  activeFilePath: null,
  openFiles: [],
  selectedText: '',
  terminalOutput: [],
  currentErrors: [],
  previewUrl: null,

  // Git 초기값
  gitBranch: '',
  gitChanges: [],
  gitLog: [],
  gitLoading: false,

  setProject: (id, name) => {
    // 프로젝트 전환 시 기존 WebContainer 정리
    const prev = get().webcontainerInstance;
    if (prev) {
      import('@/lib/dev/webcontainer').then(m => m.teardown());
    }
    set({
      projectId: id,
      projectName: name,
      activeFilePath: null,
      openFiles: [],
      selectedText: '',
      terminalOutput: [],
      currentErrors: [],
      gitBranch: '',
      gitChanges: [],
      gitLog: [],
      webcontainerStatus: 'idle',
      webcontainerError: null,
      webcontainerInstance: null,
      previewUrl: null,
    });
  },

  clearProject: () => {
    const prev = get().webcontainerInstance;
    if (prev) {
      import('@/lib/dev/webcontainer').then(m => m.teardown());
    }
    set({
      projectId: null,
      projectName: '',
      activeFilePath: null,
      openFiles: [],
      selectedText: '',
      terminalOutput: [],
      currentErrors: [],
      webcontainerStatus: 'idle',
      webcontainerError: null,
      webcontainerInstance: null,
      previewUrl: null,
    });
  },

  setAdminMode: (mode) => set({ isAdminMode: mode }),

  setWebcontainerStatus: (status, error) => set({
    webcontainerStatus: status,
    webcontainerError: error || null,
  }),

  setWebcontainerInstance: (instance) => set({ webcontainerInstance: instance }),

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
    terminalOutput: [...s.terminalOutput.slice(-99), {
      ...entry,
      stdout: entry.stdout.slice(0, 100_000),
      stderr: entry.stderr.slice(0, 10_000),
    }],
  })),

  clearTerminalOutput: () => set({ terminalOutput: [] }),

  setCurrentErrors: (errors) => set({ currentErrors: errors }),
  setPreviewUrl: (url) => set({ previewUrl: url }),

  refreshGitStatus: async () => {
    const { isAdminMode, webcontainerInstance } = get();
    set({ gitLoading: true });

    try {
      if (!isAdminMode && webcontainerInstance) {
        // WebContainer 모드: 컨테이너 내부 git
        const { wcGitStatus } = await import('@/lib/dev/webcontainer-git');
        const result = await wcGitStatus(webcontainerInstance);
        set({
          gitBranch: result.branch,
          gitChanges: result.changes,
          gitLog: result.log,
          gitLoading: false,
        });
      } else {
        // Admin 모드: 서버 API
        const res = await fetch('/api/dev/git');
        if (!res.ok) throw new Error('Git status fetch failed');
        const data = await res.json();
        set({
          gitBranch: data.branch || '',
          gitChanges: data.changes || [],
          gitLog: data.log || [],
          gitLoading: false,
        });
      }
    } catch {
      set({ gitLoading: false });
    }
  },
}));
