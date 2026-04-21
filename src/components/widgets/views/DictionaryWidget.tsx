'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DictionaryView } from '@/components/views/DictionaryView';

/**
 * 한자사전 전용 위젯 — /api/hanja/search를 서버사이드 모드로 사용
 * skip_count: 페이지 이동 시 count 재계산 생략 (캐시된 total 유지)
 */
export function DictionaryWidget() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [allFilters, setAllFilters] = useState<{ grades: [string, number][]; radicals: [string, number][] } | undefined>(undefined);
  const cachedTotal = useRef(0);
  const prevFilters = useRef<string>('');

  useEffect(() => {
    fetch('/api/hanja/filters')
      .then(r => r.json())
      .then(data => {
        setAllFilters({
          grades: (data.grades ?? []).map((g: any) => [g.grade, g.count] as [string, number]),
          radicals: (data.radicals ?? []).map((r: any) => [r.char, r.count] as [string, number]),
        });
      })
      .catch(() => {});
  }, []);

  const fetchHanja = useCallback(async (
    params: Record<string, string | number | undefined> = {},
    skipCount = false,
  ) => {
    setLoading(true);
    try {
      const url = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') url.set(k, String(v));
      });
      if (!url.has('limit')) url.set('limit', '100');
      if (skipCount) url.set('skip_count', 'true');

      const res = await fetch(`/api/hanja/search?${url}`);
      const data = await res.json();
      setNodes(data.nodes ?? []);
      if (!skipCount) {
        cachedTotal.current = data.total ?? 0;
        setTotal(data.total ?? 0);
      }
      // skip_count 시 기존 total 유지
    } catch { /* fire-and-forget */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHanja(); }, [fetchHanja]);

  const handleSearch = useCallback((params: {
    query?: string;
    radical?: string;
    grade?: string;
    strokeMin?: string;
    strokeMax?: string;
    char_type?: string;
    page?: number;
  }) => {
    const filterKey = JSON.stringify({
      q: params.query, radical: params.radical, grade: params.grade,
      strokeMin: params.strokeMin, strokeMax: params.strokeMax, char_type: params.char_type,
    });
    const isPageOnly = filterKey === prevFilters.current;
    prevFilters.current = filterKey;

    fetchHanja({
      q: params.query,
      radical: params.radical,
      grade: params.grade,
      stroke_min: params.strokeMin,
      stroke_max: params.strokeMax,
      char_type: params.char_type,
      page: params.page,
    }, isPageOnly && (params.page ?? 1) > 1);
  }, [fetchHanja]);

  return (
    <DictionaryView
      nodes={nodes}
      onSearch={handleSearch}
      total={total}
      loading={loading}
      allFilters={allFilters}
    />
  );
}
