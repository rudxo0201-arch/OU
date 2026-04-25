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
  initialNodes?: any[];
}

export function OrbView({ domain, viewType, orbSlug, placeholder, initialNodes }: OrbViewProps) {
  const [nodes, setNodes] = useState<any[]>(initialNodes ?? []);
  const [loading, setLoading] = useState(initialNodes === undefined && !!domain);

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

  // initialNodes가 없을 때만 첫 fetch
  useEffect(() => {
    if (initialNodes === undefined) fetchNodes();
  }, [fetchNodes, initialNodes]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!domain || !detail?.domain || detail.domain === domain) {
        fetchNodes();
      }
    };
    window.addEventListener('ou-node-created', handler);
    return () => window.removeEventListener('ou-node-created', handler);
  }, [domain, fetchNodes]);

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
        () => { fetchNodes(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
