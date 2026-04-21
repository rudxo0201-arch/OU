'use client';

/**
 * Finance Widget C — Category Breakdown
 * 이번 달 총액 + 카테고리별 비중 게이지 바
 * 레퍼런스: Spendee, Goodbudget
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FinanceNode {
  id: string;
  domain_data: { amount?: number | string; category?: string; title?: string };
  created_at: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  식비: '🍜', 카페: '☕', 커피: '☕', 교통: '🚌',
  쇼핑: '🛍', 편의점: '🏪', 병원: '🏥', 기타: '📌',
};
function getCategoryEmoji(cat: string): string {
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (cat.includes(key)) return emoji;
  }
  return '📌';
}

function parseAmount(v: number | string | undefined): number {
  if (v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.]/g, '')) : v;
  return isNaN(n) ? 0 : n;
}

export function FinanceWidgetC() {
  const [nodes, setNodes] = useState<FinanceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => {
    fetch('/api/nodes?domain=finance&limit=200')
      .then(r => r.json())
      .then(d => { setNodes(d.nodes || []); setLoading(false); })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter this month
  const monthNodes = nodes.filter(n => n.created_at.slice(0, 10) >= monthStart);
  const total = monthNodes.reduce((s, n) => s + parseAmount(n.domain_data.amount), 0);

  // Group by category
  const catMap: Record<string, number> = {};
  for (const n of monthNodes) {
    const cat = n.domain_data.category || '기타';
    catMap[cat] = (catMap[cat] || 0) + parseAmount(n.domain_data.amount);
  }
  const categories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 20px 16px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
          marginBottom: 5, fontFamily: 'var(--ou-font-logo)',
        }}>
          이번 달 지출
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 9, color: 'var(--ou-text-muted)', fontFamily: 'var(--ou-font-mono)' }}>₩</span>
          <span style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 28, fontWeight: 700, lineHeight: 1,
            color: 'var(--ou-text-bright)',
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {loading ? '—' : total.toLocaleString('ko-KR')}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--ou-border-subtle)', marginBottom: 13, flexShrink: 0 }} />

      {/* ── Category Bars ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : categories.length === 0 ? (
          <button onClick={() => router.push('/orb')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', padding: 0, fontSize: 12,
            color: 'var(--ou-text-muted)', lineHeight: 1.5,
          }}>
            Orb에서 지출을 말해보세요 →
          </button>
        ) : categories.map(([cat, amt]) => {
          const pct = total > 0 ? (amt / total) * 100 : 0;
          return (
            <div key={cat}>
              {/* Category row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12 }}>{getCategoryEmoji(cat)}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ou-text-body)' }}>
                    {cat}
                  </span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  fontFamily: 'var(--ou-font-mono)',
                  color: 'var(--ou-text-strong)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  ₩{amt.toLocaleString('ko-KR')}
                </span>
              </div>
              {/* Progress gauge */}
              <div style={{
                height: 4, borderRadius: 2,
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-pressed-sm)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'var(--ou-text-secondary)',
                  borderRadius: 2,
                  transition: 'width 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
