'use client';

/**
 * usePreferencesSync — 사용자 환경설정 DB 싱크
 *
 * 로그인 시: DB에서 preferences 로드 → 각 store에 적용
 * 변경 시:   각 store 변경 감지 → debounce 후 DB에 저장
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWidgetStore, type WidgetPage } from '@/stores/widgetStore';
import { useNavigationStore } from '@/stores/navigationStore';

const SAVE_DEBOUNCE_MS = 800;

/** 현재 store 상태를 preferences 객체로 수집 */
function collectPreferences() {
  const widgetState = useWidgetStore.getState();
  const navState = useNavigationStore.getState();

  return {
    widget: {
      pages: widgetState.pages,
      currentPageIndex: widgetState.currentPageIndex,
      gridCols: widgetState.gridCols,
      gridRows: widgetState.gridRows,
    },
    navigation: {
      savedViews: navState.savedViews,
      pinnedViewIds: navState.pinnedViewIds,
      chatPanelOpen: navState.chatPanelOpen,
      collapsed: navState.collapsed,
    },
    display: {
      theme: typeof window !== 'undefined' ? localStorage.getItem('ou-theme') : null,
      palette: typeof window !== 'undefined' ? localStorage.getItem('ou-palette') : null,
    },
  };
}

/** DB에서 가져온 preferences를 각 store에 적용 */
function applyPreferences(prefs: ReturnType<typeof collectPreferences>) {
  if (!prefs) return;

  // Widget layout 복원
  if (prefs.widget?.pages?.length) {
    const ws = useWidgetStore.getState();
    ws.setPages(prefs.widget.pages);
    if (typeof prefs.widget.currentPageIndex === 'number') {
      ws.setCurrentPage(prefs.widget.currentPageIndex);
    }
    if (prefs.widget.gridCols && prefs.widget.gridRows) {
      ws.setGridSize(prefs.widget.gridCols, prefs.widget.gridRows);
    }
  }

  // Navigation 복원
  if (prefs.navigation) {
    const ns = useNavigationStore.getState();
    if (prefs.navigation.savedViews?.length) {
      ns.setSavedViews(prefs.navigation.savedViews);
    }
    if (prefs.navigation.pinnedViewIds?.length) {
      ns.setPinnedViewIds(prefs.navigation.pinnedViewIds);
    }
  }

  // Display 복원
  if (prefs.display) {
    if (prefs.display.theme && typeof window !== 'undefined') {
      localStorage.setItem('ou-theme', prefs.display.theme);
      document.documentElement.setAttribute('data-theme', prefs.display.theme);
    }
    if (prefs.display.palette && typeof window !== 'undefined') {
      localStorage.setItem('ou-palette', prefs.display.palette);
      document.documentElement.setAttribute('data-palette', prefs.display.palette);
    }
  }
}

export function usePreferencesSync() {
  const user = useAuthStore(s => s.user);
  const loadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSaveRef = useRef(false);

  // DB에 저장
  const saveToDB = useCallback(async () => {
    if (skipNextSaveRef.current) return;
    try {
      const preferences = collectPreferences();
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });
    } catch {
      // 무시 — 다음 변경 시 재시도
    }
  }, []);

  // DB에서 로드
  const loadFromDB = useCallback(async () => {
    try {
      const res = await fetch('/api/preferences');
      if (!res.ok) return;
      const { preferences } = await res.json();
      if (preferences?.widget?.pages?.length) {
        // DB에 실질적인 레이아웃이 있을 때만 적용
        // (DB가 DEFAULT_PAGES를 가지고 있으면 localStorage를 덮어쓰지 않음)
        const currentPages = useWidgetStore.getState().pages;
        const dbPages = preferences.widget.pages as WidgetPage[];
        const dbHasCustomWidgets = dbPages.some(p =>
          p.widgets.some(w => w.type !== 'today' && w.type !== 'streak' && w.type !== 'quick-input')
        );
        const localHasCustomWidgets = currentPages.some(p =>
          p.widgets.some(w => w.type !== 'today' && w.type !== 'streak' && w.type !== 'quick-input')
        );

        // DB가 더 풍부하거나 local이 비어있을 때만 적용
        if (dbHasCustomWidgets || !localHasCustomWidgets) {
          skipNextSaveRef.current = true;
          applyPreferences(preferences);
          setTimeout(() => { skipNextSaveRef.current = false; }, 500);
        }
      } else if (preferences && !preferences.widget?.pages?.length) {
        // DB가 비어있으면 현재 local 상태를 DB에 저장
        setTimeout(saveToDB, 100);
      }
    } catch {
      // 무시 — localStorage fallback 유지
    }
  }, [saveToDB]);

  // debounced save
  const scheduleSave = useCallback(() => {
    if (skipNextSaveRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToDB, SAVE_DEBOUNCE_MS);
  }, [saveToDB]);

  // 로그인 시 DB에서 로드
  useEffect(() => {
    if (user && !loadedRef.current) {
      loadedRef.current = true;
      loadFromDB();
    }
    if (!user) {
      loadedRef.current = false;
    }
  }, [user, loadFromDB]);

  // Store 변경 감지 → DB 저장
  useEffect(() => {
    if (!user) return;

    const unsubWidget = useWidgetStore.subscribe(scheduleSave);
    const unsubNav = useNavigationStore.subscribe(scheduleSave);

    // theme/palette는 storage event로 감지
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ou-theme' || e.key === 'ou-palette') {
        scheduleSave();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 탭 전환/창 이동 시 즉시 저장 (debounce 대기 중인 것도 포함)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        saveToDB();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubWidget();
      unsubNav();
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // cleanup 시 저장 (in-app navigation 대비)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveToDB();
      }
    };
  }, [user, scheduleSave]);
}
