'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE, formatAmount } from './base';

export function FinanceCompareView({ nodes }: ViewProps) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const thisMonthTotal = nodes.filter(n => {
    const d = new Date(n.domain_data?.date || n.created_at || 0);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).reduce((sum, n) => sum + (parseFloat(String(n.domain_data?.amount || 0)) || 0), 0);

  const lastMonthTotal = nodes.filter(n => {
    const d = new Date(n.domain_data?.date || n.created_at || 0);
    const lm = thisMonth === 0 ? 11 : thisMonth - 1;
    const ly = thisMonth === 0 ? thisYear - 1 : thisYear;
    return d.getMonth() === lm && d.getFullYear() === ly;
  }).reduce((sum, n) => sum + (parseFloat(String(n.domain_data?.amount || 0)) || 0), 0);

  const diff = thisMonthTotal - lastMonthTotal;
  const pct = lastMonthTotal > 0 ? Math.abs(Math.round((diff / lastMonthTotal) * 100)) : null;

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ ...TYPE.label, marginBottom: '14px' }}>MONTHLY COMPARE</div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={TYPE.meta}>지난달</div>
          <div style={{ ...TYPE.sub, fontWeight: 700, fontSize: '16px', marginTop: '4px' }}>
            {formatAmount(lastMonthTotal)}원
          </div>
        </div>
        <div style={{ width: '1px', background: 'rgba(0,0,0,0.06)' }} />
        <div style={{ flex: 1 }}>
          <div style={TYPE.meta}>이번달</div>
          <div style={{ ...TYPE.sub, fontWeight: 700, fontSize: '16px', marginTop: '4px' }}>
            {formatAmount(thisMonthTotal)}원
          </div>
        </div>
      </div>
      {pct !== null && (
        <div style={{ ...TYPE.meta, marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          지난달 대비 {diff > 0 ? '+' : '-'}{pct}% {diff > 0 ? '증가' : '감소'}
        </div>
      )}
    </div>
  );
}
