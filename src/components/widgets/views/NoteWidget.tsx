'use client';
import { ROUTES, ORB_SLUGS, DOMAINS } from '@/lib/ou-registry';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useWidgetSize } from './useWidgetSize';

interface NoteNode {
  id: string;
  domain_data: { title?: string; content?: string };
  raw?: string;
  created_at: string;
}

export function NoteWidget() {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(rootRef);
  const [notes, setNotes] = useState<NoteNode[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNodes = useCallback(() => {
    fetch('/api/nodes?domain=note&limit=5')
      .then(r => r.ok ? r.json() : { nodes: [] })
      .then(d => {
        setNotes(Array.isArray(d.nodes) ? d.nodes : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);
  useEffect(() => { router.prefetch(ROUTES.ORB(ORB_SLUGS.NOTE)); }, [router]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('home-widget-note')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_nodes', filter: 'domain=eq.note' }, fetchNodes)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchNodes]);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.domain === DOMAINS.NOTE) fetchNodes();
    };
    window.addEventListener('ou-node-created', handler);
    return () => window.removeEventListener('ou-node-created', handler);
  }, [fetchNodes]);

  return (
    <div ref={rootRef} style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
      {size !== 'sm' && (
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'var(--ou-text-dimmed)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
          fontFamily: 'var(--ou-font-logo)', marginBottom: 12, flexShrink: 0,
        }}>
          최근 노트
        </span>
      )}

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>불러오는 중...</div>
        ) : notes.length === 0 ? (
          <button
            onClick={() => router.push(ROUTES.ORB(ORB_SLUGS.NOTE))}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', padding: 0,
              fontSize: 11, color: 'var(--ou-text-muted)', lineHeight: 1.6,
            }}
          >
            노트를 기록해보세요 →
          </button>
        ) : notes.map(note => {
          const d = new Date(note.created_at);
          const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
          const title = note.domain_data?.title || note.raw?.slice(0, 40) || '노트';
          return (
            <div key={note.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <span style={{
                fontSize: 12, fontWeight: 500, color: 'var(--ou-text-strong)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>
                {title}
              </span>
              {size !== 'sm' && (
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', flexShrink: 0 }}>{dateStr}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
