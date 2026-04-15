'use client';

import { useState, useCallback } from 'react';
import { Container } from '@mantine/core';
import { DictionaryView } from '@/components/views/DictionaryView';

interface Props {
  initialNodes: any[];
}

export function DictionaryPageClient({ initialNodes }: Props) {
  const [nodes, setNodes] = useState<any[]>(initialNodes);
  const [total, setTotal] = useState(initialNodes.length);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (params: {
    query?: string;
    radical?: string;
    grade?: string;
    strokeMin?: string;
    strokeMax?: string;
    compType?: string;
    page?: number;
  }) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (params.query) searchParams.set('q', params.query);
      if (params.radical) searchParams.set('radical', params.radical);
      if (params.grade) searchParams.set('grade', params.grade);
      if (params.strokeMin) searchParams.set('stroke_min', params.strokeMin);
      if (params.strokeMax) searchParams.set('stroke_max', params.strokeMax);
      if (params.compType) searchParams.set('comp_type', params.compType);
      if (params.page) searchParams.set('page', params.page.toString());
      searchParams.set('limit', '100');

      const res = await fetch(`/api/hanja/search?${searchParams.toString()}`);
      const data = await res.json();

      if (data.nodes) {
        setNodes(data.nodes);
        setTotal(data.total ?? data.nodes.length);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Container size="xl" py="md">
      <DictionaryView
        nodes={nodes}
        onSearch={handleSearch}
        total={total}
        loading={loading}
      />
    </Container>
  );
}
