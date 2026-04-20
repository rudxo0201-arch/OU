'use client';

/**
 * FinanceAmountView — 금액 강조 지출 카드
 * "점심 12000원" → 12,000원 크게
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData, formatAmount } from './base';

export function FinanceAmountView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const amount = data.amount || data.price || data.cost || data.value;
  const category = data.category || data.type;
  const memo = data.memo || data.description || data.note;
  const title = data.title || nodes[0]?.title || '';
  const isIncome = data.type === 'income' || data.direction === 'income';

  if (!amount && !title) return null;

  return (
    <InlineCard label="FINANCE">
      {/* 카테고리 */}
      {category && (
        <div style={{ ...TYPE.label, marginBottom: '8px' }}>{category}</div>
      )}

      {/* 금액 — 핵심 강조 */}
      {amount !== undefined && (
        <div style={{
          ...TYPE.emphasis,
          marginBottom: '6px',
          color: isIncome ? 'var(--ou-text-primary, #1a1a1a)' : 'var(--ou-text-primary, #1a1a1a)',
        }}>
          {isIncome ? '+' : '-'}{formatAmount(amount)}
          <span style={{ fontSize: '18px', fontWeight: 500, marginLeft: '4px' }}>원</span>
        </div>
      )}

      {/* 메모/제목 */}
      {(memo || title) && (
        <div style={TYPE.sub}>{memo || title}</div>
      )}
    </InlineCard>
  );
}
