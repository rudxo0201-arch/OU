import { create } from 'zustand';

interface AdminState {
  /** 현재 활성 탭 */
  activeTab: string;
  setActiveTab: (tab: string) => void;

  /** DB 에디터: 선택된 테이블 */
  selectedTable: string | null;
  setSelectedTable: (table: string | null) => void;

  /** 회원 관리: 하위 탭 */
  memberSubTab: 'members' | 'roles';
  setMemberSubTab: (tab: 'members' | 'roles') => void;

  /** 뷰 관리: 하위 탭 */
  viewSubTab: 'editor' | 'settings';
  setViewSubTab: (tab: 'editor' | 'settings') => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  activeTab: 'nodes',
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedTable: null,
  setSelectedTable: (table) => set({ selectedTable: table }),

  memberSubTab: 'members',
  setMemberSubTab: (tab) => set({ memberSubTab: tab }),

  viewSubTab: 'editor',
  setViewSubTab: (tab) => set({ viewSubTab: tab }),
}));
