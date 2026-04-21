import { create } from 'zustand';

const GUEST_STORAGE_KEY = 'ou-guest-chat';

export interface SuggestionItem {
  question: string;
  options: string[];
}

export type Suggestion = string | SuggestionItem;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  streaming?: boolean;
  isStatus?: boolean; // LLM 처리 중 상태 메시지 (실제 응답과 구분)
  suggestions?: Suggestion[];
  viewHints?: string[];
  nodeCreated?: {
    domain: string;
    nodeId?: string;
    confidence?: string;
    domain_data?: Record<string, any>;
    viewType?: string;
    viewConfirmed?: boolean;
    additionalNodes?: Array<{ id: string; domain: string; domain_data: Record<string, any> }>;
  };
  /** 이미지 업로드 시 미리보기 URL */
  imagePreview?: string;
  /** OCR 결과 (이미지 업로드 시) */
  ocrResult?: { text: string; imageType: string };
  /** LLM intent — conversation이면 "뷰 생성하기" 버튼 표시 조건 */
  intent?: string;
  /** LLM meta에서 추출한 대화 주제 요약 (세션 제목으로 사용) */
  title?: string;
  /** 파일 업로드 결과 */
  fileResult?: {
    fileType: 'pdf' | 'text' | 'ou' | 'ppt' | 'hwp' | 'docx' | 'xlsx' | 'video' | 'audio';
    fileName: string;
    pageCount?: number;
    textContent?: string;
    ouContent?: string;
    nodeId?: string;
  };
  /** 유튜브 임베드 (URL 감지 시) */
  youtubeEmbed?: { videoId: string; title?: string };
  /** 한자 검색 결과 (메시지 내 CJK 문자 감지 시) */
  hanjaResults?: Array<{
    char: string;
    nodeId: string;
    sound?: string;
    hun?: string;
    meaning?: string;
    radical?: string;
    stroke_count?: number;
    grade?: string;
    etymology?: string;
    mnemonic?: string;
    compounds?: string;
    domain?: string;
    char_type?: string;
    pinyin?: string;
  }>;
}

interface ChatStore {
  messages: ChatMessage[];
  turnCount: number;
  isStreaming: boolean;
  showUpgradeModal: boolean;
  /** 랜딩에서 입력 후 /orb로 전달할 메시지 */
  pendingMessage: string | null;
  /** View 패널에 렌더링된 뷰 목록 (A/B 모두 누적) */
  requestedViews: Array<{ viewType: string; filter?: Record<string, any>; cards?: Array<{ front: string; back: string }> }>;
  /** LLM이 추천한 뷰 선택지 (회원이 선택 전 상태) */
  pendingViewOptions: {
    options: string[];
    filter?: Record<string, any>;
    cards?: Array<{ front: string; back: string }>;
    intent?: string;
    nodeId?: string;
  } | null;
  /** 마지막 메시지의 intent (C → 뷰 전환 버튼 표시 조건) */
  lastIntent: string | null;
  /** 마지막으로 생성된 노드 ID (suggestion 답변 연결용) */
  lastCreatedNodeId: string | null;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setStreaming: (v: boolean) => void;
  setShowUpgradeModal: (show: boolean) => void;
  setPendingMessage: (msg: string | null) => void;
  removeMessage: (id: string) => void;
  addRequestedView: (view: { viewType: string; filter?: Record<string, any>; cards?: Array<{ front: string; back: string }> }) => void;
  confirmViewForMessage: (messageId: string, selectedViewTypes: string[]) => void;
  clearRequestedViews: () => void;
  setPendingViewOptions: (opts: ChatStore['pendingViewOptions']) => void;
  clearPendingViewOptions: () => void;
  setLastIntent: (intent: string | null) => void;
  setLastCreatedNodeId: (id: string | null) => void;
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
  isStreaming: false,
  showUpgradeModal: false,
  pendingMessage: null,
  requestedViews: [],
  pendingViewOptions: null,
  lastIntent: null,
  lastCreatedNodeId: null,
  setStreaming: (v) => set({ isStreaming: v }),
  addMessage: msg => set(s => ({
    messages: [...s.messages, msg],
    turnCount: msg.role === 'user' ? s.turnCount + 1 : s.turnCount,
  })),
  updateMessage: (id, updates) => set(s => ({
    messages: s.messages.map(m => m.id === id ? { ...m, ...updates } : m),
  })),
  setShowUpgradeModal: show => set({ showUpgradeModal: show }),
  setPendingMessage: msg => set({ pendingMessage: msg }),
  removeMessage: id => set(s => ({
    messages: s.messages.filter(m => m.id !== id),
  })),
  addRequestedView: view => set(s => ({ requestedViews: [...s.requestedViews, view] })),
  confirmViewForMessage: (messageId, selectedViewTypes) => set(s => ({
    messages: s.messages.map(m => m.id === messageId && m.nodeCreated
      ? { ...m, nodeCreated: { ...m.nodeCreated, viewConfirmed: true, viewType: selectedViewTypes[0] } }
      : m
    ),
  })),
  clearRequestedViews: () => set({ requestedViews: [] }),
  setPendingViewOptions: opts => set({ pendingViewOptions: opts }),
  clearPendingViewOptions: () => set({ pendingViewOptions: null }),
  setLastIntent: intent => set({ lastIntent: intent }),
  setLastCreatedNodeId: id => set({ lastCreatedNodeId: id }),
  reset: () => set({ messages: [], turnCount: 0, pendingMessage: null, requestedViews: [], pendingViewOptions: null, lastIntent: null, lastCreatedNodeId: null }),

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
