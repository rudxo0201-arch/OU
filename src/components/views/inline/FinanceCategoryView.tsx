'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE, formatAmount } from './base';

export function FinanceCategoryView({ nodes }: ViewProps) {
  const byCategory = new Map<string, number>();
  nodes.forEach(n => {
    const cat = n.domain_data?.category || n.domain_data?.type || '기타';
    const amt = parseFloat(String(n.domain_data?.amount || 0)) || 0;
    byCategory.set(cat, (byCategory.get(cat) || 0) + amt);
  });

  const sorted = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ ...TYPE.label, marginBottom: '14px' }}>BY CATEGORY</div>
      {sorted.length === 0 ? (
        <div style={TYPE.sub}>데이터가 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {sorted.map(([cat, amt], i) => {
            const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
            return (
              <div key={cat} style={{
                padding: '9px 0',
                borderBottom: i < sorted.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={TYPE.sub}>{cat}</span>
                  <span style={{ ...TYPE.sub, fontWeight: 600 }}>{formatAmount(amt)}원</span>
                </div>
                <div style={{ height: '3px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: 'rgba(0,0,0,0.18)',
                    borderRadius: '2px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
