'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { NEU, TYPE, formatAmount } from './base';

export function FinanceTodayView({ nodes }: ViewProps) {
  const today = new Date().toDateString();
  const todayNodes = nodes.filter(n => {
    const date = n.domain_data?.date || n.created_at;
    return date && new Date(date).toDateString() === today;
  });

  const total = todayNodes.reduce((sum, n) => {
    return sum + (parseFloat(String(n.domain_data?.amount || 0)) || 0);
  }, 0);

  return (
    <div style={{ ...NEU.card }}>
      <div style={{ ...TYPE.label, marginBottom: '8px' }}>TODAY</div>
      <div style={{ ...TYPE.emphasis, marginBottom: '14px' }}>
        {formatAmount(total)}
        <span style={{ fontSize: '18px', fontWeight: 500, marginLeft: '4px' }}>원</span>
      </div>
      {todayNodes.length === 0 ? (
        <div style={TYPE.sub}>오늘 기록이 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {todayNodes.map((node, i) => {
            const d = node.domain_data || {};
            return (
              <div key={node.id || i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i < todayNodes.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <span style={TYPE.sub}>{d.category || d.memo || node.title || '기타'}</span>
                <span style={{ ...TYPE.sub, fontWeight: 600 }}>{formatAmount(d.amount)}원</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
