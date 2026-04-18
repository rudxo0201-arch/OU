import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';

const SETTINGS_KEY = 'graph_settings';

export interface GraphSettings {
  nodeColor: string;
  adaptiveColor: boolean;
  nodeSize: number;
  linkThickness: number;
  labelZoom: number;
  showLabels: boolean;
  showGlow: boolean;
  repulsion: number;
  linkDistance: number;
  linkStrength: number;
  centerForce: number;
}

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
  nodeColor: '#888888',
  adaptiveColor: true,
  nodeSize: 1,
  linkThickness: 0.3,
  labelZoom: 4,
  showLabels: true,
  showGlow: true,
  repulsion: 8,
  linkDistance: 25,
  linkStrength: 0.3,
  centerForce: 0.03,
};

interface GraphSettingsState {
  settings: GraphSettings;
  _userId: string | null;
  _loaded: boolean;

  /** 설정 값 변경 (로컬 + Supabase 동기화) */
  set: <K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => void;
  /** 전체 초기화 */
  reset: () => void;
  /** 로그인 사용자 설정 로드 (Supabase → 로컬 병합) */
  loadForUser: (userId: string) => Promise<void>;
  /** 현재 설정을 Supabase에 저장 */
  saveToRemote: () => Promise<void>;
}

/** Supabase에 비동기 저장 (debounce용) */
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSaveToRemote(state: () => GraphSettingsState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    state().saveToRemote();
  }, 1000);
}

export const useGraphSettingsStore = create<GraphSettingsState>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_GRAPH_SETTINGS },
      _userId: null,
      _loaded: false,

      set: (key, value) => {
        set(state => ({
          settings: { ...state.settings, [key]: value },
        }));
        if (get()._userId) {
          debouncedSaveToRemote(get);
        }
      },

      reset: () => {
        set({ settings: { ...DEFAULT_GRAPH_SETTINGS } });
        if (get()._userId) {
          debouncedSaveToRemote(get);
        }
      },

      loadForUser: async (userId: string) => {
        if (get()._userId === userId && get()._loaded) return;
        set({ _userId: userId });
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from('user_settings')
            .select('value')
            .eq('user_id', userId)
            .eq('key', SETTINGS_KEY)
            .single();
          if (data?.value) {
            // 서버 값과 기본값 병합 (새 필드가 추가되어도 안전)
            set({
              settings: { ...DEFAULT_GRAPH_SETTINGS, ...data.value as Partial<GraphSettings> },
              _loaded: true,
            });
          } else {
            set({ _loaded: true });
          }
        } catch {
          // 테이블 미생성 등 — localStorage 값 그대로 사용
          set({ _loaded: true });
        }
      },

      saveToRemote: async () => {
        const { _userId, settings } = get();
        if (!_userId) return;
        try {
          const supabase = createClient();
          await supabase
            .from('user_settings')
            .upsert({
              user_id: _userId,
              key: SETTINGS_KEY,
              value: settings,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,key' });
        } catch {
          // 실패 시 무시 — localStorage에는 이미 저장됨
        }
      },
    }),
    {
      name: 'ou-graph-settings',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
