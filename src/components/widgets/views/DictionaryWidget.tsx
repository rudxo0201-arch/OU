'use client';

import { useState, useCallback, useEffect } from 'react';
import { DictionaryView } from '@/components/views/DictionaryView';

/**
 * 한자사전 전용 위젯 — /api/hanja/search를 서버사이드 모드로 사용
 */
export function DictionaryWidget() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchHanja = useCallback(async (params: Record<string, string | number | undefined> = {}) => {
    setLoading(true);
    try {
      const url = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') url.set(k, String(v));
      });
      if (!url.has('limit')) url.set('limit', '100');
      const res = await fetch(`/api/hanja/search?${url}`);
      const data = await res.json();
      setNodes(data.nodes ?? []);
      setTotal(data.total ?? 0);
    } catch { /* fire-and-forget */ } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => { fetchHanja(); }, [fetchHanja]);

  const handleSearch = useCallback((params: {
    query?: string;
    radical?: string;
    grade?: string;
    strokeMin?: string;
    strokeMax?: string;
    compType?: string;
    page?: number;
  }) => {
    fetchHanja({
      q: params.query,
      radical: params.radical,
      grade: params.grade,
      stroke_min: params.strokeMin,
      stroke_max: params.strokeMax,
      comp_type: params.compType,
      page: params.page,
    });
  }, [fetchHanja]);

  return (
    <DictionaryView
      nodes={nodes}
      onSearch={handleSearch}
      total={total}
      loading={loading}
    />
  );
}
