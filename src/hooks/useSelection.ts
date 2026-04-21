import { useState, useCallback } from 'react';
import type { SelectionState } from '@/types/admin';

export function useSelection<T = string>(pageIds: T[]): SelectionState<T> {
  const [selected, setSelected] = useState<Set<T>>(new Set());
  const [isAllPages, setIsAllPages] = useState(false);

  const toggle = useCallback((id: T) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setIsAllPages(false);
  }, []);

  const selectPage = useCallback((ids: T[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const deselectPage = useCallback((ids: T[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setIsAllPages(true);
    setSelected(new Set(pageIds));
  }, [pageIds]);

  const clearAll = useCallback(() => {
    setSelected(new Set());
    setIsAllPages(false);
  }, []);

  const isSelected = useCallback((id: T) => selected.has(id), [selected]);

  const allOnPage = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const someOnPage = pageIds.some(id => selected.has(id));

  return {
    selected,
    isAllPages,
    toggle,
    selectPage,
    deselectPage,
    selectAll,
    clearAll,
    isSelected,
    headerCheckbox: {
      checked: allOnPage,
      indeterminate: !allOnPage && someOnPage,
    },
    count: selected.size,
  };
}
