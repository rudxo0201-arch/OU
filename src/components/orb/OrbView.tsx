'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { OrbInputBar } from './OrbInputBar';

interface OrbViewProps {
  domain?: string;
  viewType: string;
  orbSlug: string;
  placeholder?: string;
}

/**
 * 각 Orb의 메인 뷰.
 * /api/nodes에서 해당 도메인 데이터를 가져와 ViewRenderer로 렌더링.
 * Supabase Realtime으로 data_nodes 변경 시 자동 갱신.
 */
export function OrbView({ domain, viewType, orbSlug, placeholder }: OrbViewProps) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNodes = useCallback(async () => {
    if (!domain) {
      setNodes([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/nodes?domain=${domain}&limit=200`);
      const json = res.ok ? await res.json() : { nodes: [] };
      setNodes(Array.isArray(json.nodes) ? json.nodes : []);
    } catch {
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  // Supabase Realtime: data_nodes 변경 시 자동 갱신
  useEffect(() => {
    if (!domain) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`orb-${orbSlug}-nodes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_nodes',
          filter: `domain=eq.${domain}`,
        },
        () => {
          // INSERT / UPDATE / DELETE 모두 전체 재조회 (목록 정합성 보장)
          fetchNodes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [domain, orbSlug, fetchNodes]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        color: 'var(--ou-text-muted)',
      }}>
        <span className="ou-spinner" style={{ width: 20, height: 20 }} />
      </div>
    );
  }

  return (
    <>
      <div style={{
        height: '100dvh',
        overflow: 'auto',
        paddingBottom: domain ? 96 : 0,
      }}>
        {/* allowEmpty=true: 뷰가 직접 빈 상태/스켈레톤을 렌더링 */}
        <ViewRenderer viewType={viewType} nodes={nodes} allowEmpty />
      </div>
      {domain && (
        <OrbInputBar
          domain={domain}
          placeholder={placeholder}
        />
      )}
    </>
  );
}
