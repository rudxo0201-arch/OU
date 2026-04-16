import { create } from 'zustand';

const GUEST_STORAGE_KEY = 'ou-guest-chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  streaming?: boolean;
  nodeCreated?: { domain: string; nodeId?: string; confidence?: string; domain_data?: Record<string, any> };
  /** 이미지 업로드 시 미리보기 URL */
  imagePreview?: string;
  /** OCR 결과 (이미지 업로드 시) */
  ocrResult?: { text: string; imageType: string };
  /** 파일 업로드 결과 */
  fileResult?: {
    fileType: 'pdf' | 'text' | 'ou' | 'ppt' | 'hwp' | 'docx' | 'xlsx' | 'video' | 'audio';
    fileName: string;
    pageCount?: number;
    textContent?: string;
    ouContent?: string;
    nodeId?: string;
  };
}

interface ChatStore {
  messages: ChatMessage[];
  turnCount: number;
  showUpgradeModal: boolean;
  /** 랜딩에서 입력 후 /chat으로 전달할 메시지 */
  pendingMessage: string | null;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setShowUpgradeModal: (show: boolean) => void;
  setPendingMessage: (msg: string | null) => void;
  reset: () => void;
  /** 게스트 메시지를 localStorage에 백업 */
  persistGuest: () => void;
  /** localStorage에서 게스트 메시지를 복원 */
  restoreGuest: () => boolean;
  /** localStorage의 게스트 메시지를 삭제 */
  clearGuestBackup: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  turnCount: 0,
  showUpgradeModal: false,
  pendingMessage: null,
  addMessage: msg => set(s => ({
    messages: [...s.messages, msg],
    turnCount: msg.role === 'user' ? s.turnCount + 1 : s.turnCount,
  })),
  updateMessage: (id, updates) => set(s => ({
    messages: s.messages.map(m => m.id === id ? { ...m, ...updates } : m),
  })),
  setShowUpgradeModal: show => set({ showUpgradeModal: show }),
  setPendingMessage: msg => set({ pendingMessage: msg }),
  reset: () => set({ messages: [], turnCount: 0, pendingMessage: null }),

  persistGuest: () => {
    try {
      const { messages, turnCount } = get();
      // streaming 중인 메시지 제외, imagePreview (blob URL)은 직렬화 불가하므로 제거
      const serializable = messages
        .filter(m => !m.streaming)
        .map(({ imagePreview, ...rest }) => ({
          ...rest,
          createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
        }));
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ messages: serializable, turnCount }));
    } catch {
      // localStorage 접근 실패 무시
    }
  },

  restoreGuest: () => {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (!raw) return false;
      const { messages, turnCount } = JSON.parse(raw);
      if (!Array.isArray(messages) || messages.length === 0) return false;
      const restored = messages.map((m: ChatMessage & { createdAt: string }) => ({
        ...m,
        createdAt: new Date(m.createdAt),
      }));
      set({ messages: restored, turnCount: turnCount ?? 0 });
      return true;
    } catch {
      return false;
    }
  },

  clearGuestBackup: () => {
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // 무시
    }
  },
}));
