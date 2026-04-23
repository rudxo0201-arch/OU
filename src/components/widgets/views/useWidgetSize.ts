import { RefObject, useEffect, useState } from 'react';

export type WidgetSizeBreak = 'sm' | 'md' | 'lg';

export function useWidgetSize(ref: RefObject<HTMLElement | null>): WidgetSizeBreak {
  const [size, setSize] = useState<WidgetSizeBreak>('md');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setSize(w < 200 ? 'sm' : w < 380 ? 'md' : 'lg');
    });
    ob.observe(el);
    return () => ob.disconnect();
  }, [ref]);

  return size;
}
