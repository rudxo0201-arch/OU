'use client';

import { useState, useCallback, useMemo } from 'react';
import type { SelectionState } from '@/types/admin';

/**
 * 범용 선택 훅 — 모든 테이블/목록에서 공통 사용
 * @param pageItemIds 현재 페이지에 표시된 아이템 ID 배열
 */
export function useSelection<T = string>(pageItemIds: T[]): SelectionState<T> {
  const [selected, setSelected] = useState<Set<T>>(new Set());
  const [isAllPages, setIsAllPages] = useState(false);

  const toggle = useCallback((id: T) => {
    setIsAllPages(false);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectPage = useCallback((ids: T[]) => {
    setIsAllPages(false);
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const deselectPage = useCallback((ids: T[]) => {
    setIsAllPages(false);
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setIsAllPages(true);
    setSelected(new Set(pageItemIds));
  }, [pageItemIds]);

  const clearAll = useCallback(() => {
    setIsAllPages(false);
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: T) => selected.has(id), [selected]);

  const headerCheckbox = useMemo(() => {
    if (pageItemIds.length === 0) return { checked: false, indeterminate: false };
    const allPageSelected = pageItemIds.every(id => selected.has(id));
    const someSelected = pageItemIds.some(id => selected.has(id));
    return {
      checked: allPageSelected,
      indeterminate: someSelected && !allPageSelected,
    };
  }, [selected, pageItemIds]);

  return {
    selected,
    isAllPages,
    toggle,
    selectPage,
    deselectPage,
    selectAll,
    clearAll,
    isSelected,
    headerCheckbox,
    count: isAllPages ? Infinity : selected.size,
  };
}
