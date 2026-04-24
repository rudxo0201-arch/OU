'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface HabitNode {
  id: string;
  domain_data: {
    title?: string;
    completed?: boolean | string;
    duration?: string;
    count?: string;
    category?: string;
  };
  raw?: string;
  created_at: string;
}

export function HabitWidget() {
  const [habits, setHabits] = useState<HabitNode[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchHabits = useCallback(() => {
    fetch('/api/nodes?domain=habit&limit=30')
      .then(r => r.json())
      .then(d => {
        const nodes: HabitNode[] = d.nodes || [];
        const seen = new Set<string>();
        const unique: HabitNode[] = [];
        for (const n of nodes) {
          if (!n.domain_data?.title) continue;
          const key = n.domain_data.title;
          if (!seen.has(key)) { seen.add(key); unique.push(n); }
          if (unique.length >= 6) break;
        }
        setHabits(unique);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('widget-habit')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_nodes', filter: 'domain=eq.habit' }, fetchHabits)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchHabits]);

  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '14px 16px',
    }}>
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: 'var(--ou-text-dimmed)',
        letterSpacing: '0.10em', textTransform: 'uppercase',
        fontFamily: 'var(--ou-font-logo)',
        marginBottom: 12, flexShrink: 0,
      }}>
        습관
      </span>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>불러오는 중...</div>
        ) : habits.length === 0 ? (
          <button
            onClick={() => router.push('/orb')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', padding: 0,
              fontSize: 11, color: 'var(--ou-text-muted)',
              lineHeight: 1.6,
            }}
          >
            Orb에서 루틴을 말해보세요 →
          </button>
        ) : habits.map(h => (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--ou-text-disabled)',
              flexShrink: 0,
            }} />
            <div style={{
              fontSize: 12, fontWeight: 500,
              color: 'var(--ou-text-strong)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {h.domain_data.title || h.raw?.slice(0, 30) || '습관'}
            </div>
            {(h.domain_data.duration || h.domain_data.count) && (
              <span style={{
                fontSize: 9, color: 'var(--ou-text-dimmed)',
                marginLeft: 'auto', flexShrink: 0,
              }}>
                {h.domain_data.duration || h.domain_data.count}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
