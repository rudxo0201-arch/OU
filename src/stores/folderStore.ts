import { create } from 'zustand';

export type GroupBy = 'domain' | 'date' | 'none';

export interface AutoFolder {
  key: string;
  label: string;
  count: number;
  icon: string;
}

interface FolderState {
  groupBy: GroupBy;
  autoFolders: AutoFolder[];
  selectedFolder: string | null;
  setGroupBy: (g: GroupBy) => void;
  setAutoFolders: (folders: AutoFolder[]) => void;
  selectFolder: (key: string | null) => void;
}

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', task: '할일', habit: '습관', journal: '일기',
  note: '노트', knowledge: '지식', idea: '아이디어', finance: '지출',
  relation: '관계', media: '미디어', care: '케어', health: '건강',
  study: '학습', development: '개발',
};

const DOMAIN_ICONS: Record<string, string> = {
  schedule: '📅', task: '✅', habit: '🔄', journal: '📔',
  note: '📝', knowledge: '🔮', idea: '💡', finance: '💰',
  relation: '👥', media: '🎬', care: '🌱', health: '❤️',
  study: '📚', development: '⚙️',
};

export { DOMAIN_LABELS, DOMAIN_ICONS };

export const useFolderStore = create<FolderState>((set) => ({
  groupBy: 'domain',
  autoFolders: [],
  selectedFolder: null,

  setGroupBy: (groupBy) => set({ groupBy, selectedFolder: null }),

  setAutoFolders: (autoFolders) => set({ autoFolders }),

  selectFolder: (key) =>
    set(s => ({ selectedFolder: s.selectedFolder === key ? null : key })),
}));

/** /api/nodes?domains=true 결과를 folderStore에 로드 */
export async function loadAutoFolders() {
  try {
    const res = await fetch('/api/nodes?domains=true');
    const data = await res.json();
    const folders: AutoFolder[] = (data.domains ?? []).map((d: { key: string; count: number }) => ({
      key: d.key,
      label: DOMAIN_LABELS[d.key] ?? d.key,
      count: d.count,
      icon: DOMAIN_ICONS[d.key] ?? '📁',
    }));
    useFolderStore.getState().setAutoFolders(folders);
  } catch {}
}
