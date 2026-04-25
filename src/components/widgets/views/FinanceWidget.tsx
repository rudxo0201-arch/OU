'use client';
import { DOMAINS } from '@/lib/ou-registry';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWidgetSize } from './useWidgetSize';

interface FinanceNode {
  id: string;
  domain_data: {
    amount?: number;
    type?: 'expense' | 'income';
    category?: string;
    title?: string;
    date?: string;
  };
  raw?: string;
  created_at: string;
}

function isToday(node: FinanceNode): boolean {
  const raw = node.domain_data?.date;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === 'today' || s === '오늘') return true;
  }
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) { d.setHours(0, 0, 0, 0); return d.getTime() === today.getTime(); }
  }
  const c = new Date(node.created_at);
  if (!isNaN(c.getTime())) { c.setHours(0, 0, 0, 0); return c.getTime() === today.getTime(); }
  return false;
}

const CATEGORY_ORDER = ['식비', '교통', '쇼핑', '의료', '주거', '통신', '교육', '여가', '기타'];

export function FinanceWidget() {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(rootRef);
  const [nodes, setNodes] = useState<FinanceNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNodes = useCallback(() => {
    fetch('/api/nodes?domain=finance&limit=50')
      .then(r => r.ok ? r.json() : { nodes: [] })
      .then(d => {
        setNodes(Array.isArray(d.nodes) ? d.nodes : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('home-widget-finance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_nodes', filter: 'domain=eq.finance' }, fetchNodes)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchNodes]);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.domain === DOMAINS.FINANCE) fetchNodes();
    };
    window.addEventListener('ou-node-created', handler);
    return () => window.removeEventListener('ou-node-created', handler);
  }, [fetchNodes]);

  const todayNodes = nodes.filter(isToday).filter(n => n.domain_data?.type !== 'income');
  const total = todayNodes.reduce((s, n) => s + (n.domain_data?.amount ?? 0), 0);

  const byCat: Record<string, number> = {};
  for (const n of todayNodes) {
    const cat = n.domain_data?.category ?? '기타';
    byCat[cat] = (byCat[cat] ?? 0) + (n.domain_data?.amount ?? 0);
  }
  const cats = CATEGORY_ORDER.filter(c => byCat[c]).map(c => ({ cat: c, amount: byCat[c] }));

  const visibleCats = size === 'sm' ? [] : size === 'md' ? cats.slice(0, 3) : cats;

  return (
    <div ref={rootRef} style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
      {size !== 'sm' && (
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'var(--ou-text-dimmed)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
          fontFamily: 'var(--ou-font-logo)', marginBottom: 10, flexShrink: 0,
        }}>
          오늘 지출
        </span>
      )}

      <div style={{
        fontSize: size === 'sm' ? 18 : 22, fontWeight: 700, color: 'var(--ou-text-strong)',
        fontFamily: 'var(--ou-font-mono)', marginBottom: size === 'sm' ? 0 : 12, flexShrink: 0,
        letterSpacing: '-0.02em',
      }}>
        {loading ? '—' : `₩${total.toLocaleString()}`}
      </div>

      {size !== 'sm' && (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {!loading && cats.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>오늘 지출이 없어요.</div>
          ) : visibleCats.map(({ cat, amount }) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--ou-text-body)' }}>{cat}</span>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-strong)' }}>
                ₩{amount.toLocaleString()}
              </span>
            </div>
          ))}
          {size === 'md' && cats.length > 3 && (
            <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)' }}>+{cats.length - 3}개 더</div>
          )}
        </div>
      )}
    </div>
  );
}
