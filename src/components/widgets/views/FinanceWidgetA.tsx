'use client';

/**
 * Finance Widget A — Amount Hero + Transaction List
 * 오늘 총지출 Orbitron 대형 숫자 + 내역 리스트
 * 레퍼런스: PocketGuard "In My Pocket" + Copilot
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FinanceNode {
  id: string;
  domain_data: {
    amount?: number | string;
    category?: string;
    title?: string;
    description?: string;
    type?: string;
  };
  raw?: string;
  created_at: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  식비: '🍜', 카페: '☕', 커피: '☕',
  교통: '🚌', 쇼핑: '🛍', 편의점: '🏪',
  병원: '🏥', 운동: '💪', 엔터테인먼트: '🎬',
  여가: '🎮', 기타: '📌',
};

function getCategoryEmoji(cat?: string): string {
  if (!cat) return '📌';
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (cat.includes(key)) return emoji;
  }
  return '📌';
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

export function FinanceWidgetA() {
  const [transactions, setTransactions] = useState<FinanceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch('/api/nodes?domain=finance&limit=50')
      .then(r => r.json())
      .then(d => {
        const nodes: FinanceNode[] = d.nodes || [];
        const todayTx = nodes
          .filter(n => n.created_at.slice(0, 10) === today && n.domain_data?.amount)
          .slice(0, 6);
        setTransactions(todayTx);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalAmount = transactions.reduce((sum, t) => {
    const amt = typeof t.domain_data.amount === 'string'
      ? parseFloat(t.domain_data.amount.replace(/[^0-9.]/g, ''))
      : (t.domain_data.amount || 0);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 20px 16px' }}>

      {/* ── Amount Hero ── */}
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
          marginBottom: 6,
          fontFamily: 'var(--ou-font-logo)',
        }}>
          오늘 지출
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: 'var(--ou-text-secondary)',
            fontFamily: 'var(--ou-font-mono)',
          }}>
            ₩
          </span>
          <span style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: loading ? 28 : 34, fontWeight: 700, lineHeight: 1,
            color: 'var(--ou-text-bright)',
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {loading ? '—' : formatAmount(totalAmount)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--ou-border-subtle)', marginBottom: 13, flexShrink: 0 }} />

      {/* ── Transaction List ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : transactions.length === 0 ? (
          <button onClick={() => router.push('/orb')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', padding: 0, fontSize: 12,
            color: 'var(--ou-text-muted)', lineHeight: 1.5,
          }}>
            Orb에서 지출을 말해보세요 →
          </button>
        ) : transactions.map(t => {
          const amt = typeof t.domain_data.amount === 'string'
            ? parseFloat(t.domain_data.amount.replace(/[^0-9.]/g, ''))
            : (t.domain_data.amount || 0);
          const label = t.domain_data.title || t.domain_data.description || t.raw?.slice(0, 20) || '지출';
          const cat = t.domain_data.category;
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Category icon */}
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-raised-xs)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
              }}>
                {getCategoryEmoji(cat)}
              </div>

              {/* Label */}
              <div style={{
                flex: 1, overflow: 'hidden',
                fontSize: 12, fontWeight: 500,
                color: 'var(--ou-text-strong)',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {label}
                {cat && <span style={{ color: 'var(--ou-text-dimmed)', fontWeight: 400 }}> · {cat}</span>}
              </div>

              {/* Amount */}
              <span style={{
                fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--ou-font-mono)',
                color: 'var(--ou-text-strong)',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {isNaN(amt) ? '—' : `₩${formatAmount(amt)}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
