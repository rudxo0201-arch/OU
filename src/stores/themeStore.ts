import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'ou-theme';

function getAutoTheme(): 'light' | 'dark' {
  // 'auto' = OS prefers-color-scheme 따름
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(pref: ThemePreference) {
  if (typeof document === 'undefined') return;
  const actual = pref === 'auto' ? getAutoTheme() : pref;
  document.documentElement.dataset.theme = actual;
}

function readStoredPref(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  return 'dark';
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'dark',

  setPreference: (pref) => {
    set({ preference: pref });
    localStorage.setItem(STORAGE_KEY, pref);
    applyTheme(pref);
    // DB 싱크는 usePreferencesSync가 storage event로 감지해서 처리
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: pref }));
  },

  init: () => {
    const pref = readStoredPref();
    set({ preference: pref });
    applyTheme(pref);

    // 'auto' 모드일 때 OS 테마 변경 감지
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        const current = readStoredPref();
        if (current === 'auto') applyTheme('auto');
      };
      mq.addEventListener('change', handler);
    }
  },
}));
