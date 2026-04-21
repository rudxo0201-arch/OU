'use client';

/**
 * FinanceAmountView — 금액 강조 지출 카드
 * 단일: "점심 12000원" → 12,000원 크게
 * 복수: "코트비 12만, 밥값 13만" → 항목별 테이블 + 총액
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData, formatAmount } from './base';

interface FinanceItem {
  name: string;
  amount: number;
  category?: string;
}

export function FinanceAmountView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const amount = data.amount || data.price || data.cost || data.value;
  const category = data.category || data.type;
  const memo = data.memo || data.description || data.note;
  const title = data.title || nodes[0]?.title || '';
  const isIncome = data.type === 'income' || data.direction === 'income';
  const items: FinanceItem[] = Array.isArray(data.items) ? data.items : [];

  if (!amount && !title && items.length === 0) return null;

  return (
    <InlineCard label="FINANCE">
      {/* 카테고리 */}
      {category && (
        <div style={{ ...TYPE.label, marginBottom: '8px' }}>{category}</div>
      )}

      {/* 총액 */}
      {amount !== undefined && (
        <div style={{ ...TYPE.emphasis, marginBottom: items.length > 0 ? '12px' : '6px' }}>
          {isIncome ? '+' : '-'}{formatAmount(amount)}
          <span style={{ fontSize: '18px', fontWeight: 500, marginLeft: '4px' }}>원</span>
        </div>
      )}

      {/* 항목 테이블 */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{
            height: 1,
            background: 'var(--ou-border-faint)',
            marginBottom: 8,
          }} />
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
            }}>
              <span style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>{item.name}</span>
              <span style={{
                fontSize: 13,
                color: 'var(--ou-text-strong)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}>
                {formatAmount(item.amount)}원
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 메모/제목 */}
      {(memo || title) && (
        <div style={{ ...TYPE.sub, marginTop: items.length > 0 ? 8 : 0 }}>{memo || title}</div>
      )}
    </InlineCard>
  );
}
