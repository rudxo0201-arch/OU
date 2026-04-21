'use client';

/**
 * Finance Widget B — 7-Day Bar Chart
 * 최근 7일 일별 지출 바 차트 + 주간 총합 + 주간 이동
 */

import { useState, useEffect } from 'react';

interface FinanceNode {
  id: string;
  domain_data: { amount?: number | string; type?: string };
  created_at: string;
}

function formatAmount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString('ko-KR');
}

function get7Days(offset: number): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + offset * 7 - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export function FinanceWidgetB() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [nodes, setNodes] = useState<FinanceNode[]>([]);
  const [loading, setLoading] = useState(true);

  const days = get7Days(weekOffset);
  const today = new Date().toISOString().slice(0, 10);
  const dateFrom = days[0];
  const dateTo = days[6];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/nodes?domain=finance&limit=200&date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.json())
      .then(d => { setNodes(d.nodes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const dailyTotals = days.map(iso => {
    const dayNodes = nodes.filter(n => n.created_at.slice(0, 10) === iso);
    return dayNodes.reduce((sum, n) => {
      const amt = typeof n.domain_data.amount === 'string'
        ? parseFloat(n.domain_data.amount.replace(/[^0-9.]/g, ''))
        : (n.domain_data.amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  });

  const maxDay = Math.max(...dailyTotals, 1);
  const weekTotal = dailyTotals.reduce((s, v) => s + v, 0);
  const todayIdx = days.indexOf(today);
  const todayTotal = todayIdx >= 0 ? dailyTotals[todayIdx] : 0;

  const dayLabels = days.map(iso => {
    const d = new Date(iso);
    return DAY_LABELS[(d.getDay() + 6) % 7];
  });

  const btnStyle: React.CSSProperties = {
    width: 20, height: 20, borderRadius: '50%', border: 'none',
    background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-xs)',
    color: 'var(--ou-text-secondary)', fontSize: 9,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, padding: 0,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 20px 16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
            fontFamily: 'var(--ou-font-logo)',
          }}>
            {weekOffset === 0 ? '이번 주' : `${dateFrom.slice(5).replace('-', '/')}~${dateTo.slice(5).replace('-', '/')}`}
          </span>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{
                height: 18, padding: '0 6px', borderRadius: 'var(--ou-radius-pill)',
                border: 'none', background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-xs)',
                color: 'var(--ou-text-muted)', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              이번주
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button style={btnStyle} onClick={() => setWeekOffset(w => w - 1)}>◁</button>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontSize: 9, color: 'var(--ou-text-muted)', fontFamily: 'var(--ou-font-mono)' }}>₩</span>
            <span style={{
              fontFamily: 'var(--ou-font-logo)',
              fontSize: 18, fontWeight: 700,
              color: 'var(--ou-text-bright)',
              letterSpacing: '-0.01em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {loading ? '—' : weekTotal.toLocaleString('ko-KR')}
            </span>
          </div>
          <button style={btnStyle} onClick={() => setWeekOffset(w => w + 1)}>▷</button>
        </div>
      </div>

      {/* ── Bar Chart ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: '100%', maxHeight: 90 }}>
          {days.map((iso, i) => {
            const val = dailyTotals[i];
            const heightPct = val > 0 ? Math.max((val / maxDay) * 100, 6) : 0;
            const isTodayBar = iso === today;
            return (
              <div key={iso} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                height: '100%', justifyContent: 'flex-end',
              }}>
                {isTodayBar && val > 0 && (
                  <span style={{
                    fontSize: 8, color: 'var(--ou-text-dimmed)',
                    fontFamily: 'var(--ou-font-mono)', letterSpacing: '-0.02em',
                  }}>
                    {formatAmount(val)}
                  </span>
                )}
                <div style={{
                  width: '100%',
                  height: heightPct > 0 ? `${heightPct}%` : '4px',
                  borderRadius: '4px 4px 2px 2px',
                  background: isTodayBar ? 'var(--ou-text-body)' : 'var(--ou-text-disabled)',
                  boxShadow: isTodayBar ? 'var(--ou-neu-raised-xs)' : 'none',
                  transition: 'height 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  minHeight: 3,
                }} />
                <span style={{
                  fontSize: 9, fontWeight: isTodayBar ? 700 : 400,
                  color: isTodayBar ? 'var(--ou-text-body)' : 'var(--ou-text-muted)',
                  letterSpacing: '0.02em',
                }}>
                  {dayLabels[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--ou-border-subtle)', margin: '12px 0', flexShrink: 0 }} />

      {/* ── Today summary ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
          {todayIdx >= 0 ? '오늘' : dateFrom.slice(5).replace('-', '/')}
        </span>
        {loading ? (
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</span>
        ) : todayTotal === 0 ? (
          <span style={{ fontSize: 11, color: 'var(--ou-text-disabled)' }}>
            Q에서 기록하세요
          </span>
        ) : (
          <span style={{
            fontFamily: 'var(--ou-font-mono)', fontSize: 12, fontWeight: 600,
            color: 'var(--ou-text-strong)', fontVariantNumeric: 'tabular-nums',
          }}>
            ₩{todayTotal.toLocaleString('ko-KR')}
          </span>
        )}
      </div>
    </div>
  );
}
