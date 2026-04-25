'use client';

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData, formatAmount } from './base';

export function FinanceBalanceView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const balance = data.balance || data.total || data.sum;
  const period = data.period || data.label;
  const note = data.note;

  // nodes에서 합산
  const total = balance ?? nodes.reduce((sum, n) => {
    const amt = n.domain_data?.amount || n.domain_data?.price || 0;
    return sum + (parseFloat(String(amt)) || 0);
  }, 0);

  return (
    <InlineCard label={period ? period.toUpperCase() : 'TOTAL'}>
      <div style={{ ...TYPE.emphasis, marginBottom: '4px' }}>
        {formatAmount(total)}
        <span style={{ fontSize: '18px', fontWeight: 500, marginLeft: '4px' }}>원</span>
      </div>
      {note && <div style={TYPE.sub}>{note}</div>}
    </InlineCard>
  );
}
