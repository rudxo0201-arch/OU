'use client';

import { useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

const CATEGORIES = ['식비', '교통', '쇼핑', '문화', '의료', '교육', '기타'] as const;

interface SpendingItem {
  amount: number;
  category: string;
  date: string;
}

export function ChartView({ nodes }: ViewProps) {
  const items: SpendingItem[] = useMemo(
    () => {
      const result: SpendingItem[] = [];
      for (const n of nodes) {
        if (!n.domain_data) continue;
        if (Array.isArray(n.domain_data.items)) {
          for (const it of n.domain_data.items) {
            result.push({
              amount: Number(it.amount) || 0,
              category: it.category ?? '기타',
              date: n.domain_data.date ?? '',
            });
          }
        } else if (n.domain_data.amount != null) {
          result.push({
            amount: Number(n.domain_data.amount) || 0,
            category: n.domain_data.category ?? '기타',
            date: n.domain_data.date ?? '',
          });
        }
      }
      return result;
    },
    [nodes],
  );

  const totalAmount = useMemo(
    () => items.reduce((sum, it) => sum + it.amount, 0),
    [items],
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of CATEGORIES) map[cat] = 0;
    for (const it of items) {
      const cat = CATEGORIES.includes(it.category as any) ? it.category : '기타';
      map[cat] = (map[cat] ?? 0) + it.amount;
    }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [items]);

  const maxAmount = useMemo(
    () => Math.max(...byCategory.map(([, v]) => v), 1),
    [byCategory],
  );

  const currentMonth = useMemo(() => {
    const dates = items.filter(it => it.date).map(it => dayjs(it.date));
    if (dates.length === 0) return dayjs().format('YYYY년 M월');
    return dates[0].format('YYYY년 M월');
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{currentMonth} 지출</span>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{totalAmount.toLocaleString()}원</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {byCategory.map(([category, amount]) => {
          const ratio = amount / maxAmount;
          const percent = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0';
          return (
            <div key={category} style={{ padding: '4px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 500 }}>{category}</span>
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{amount.toLocaleString()}원 ({percent}%)</span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'var(--ou-bg-subtle, #e0e0e0)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${ratio * 100}%`,
                    borderRadius: 4,
                    backgroundColor: 'var(--ou-text-secondary, #666)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {byCategory.length === 0 && (
        <p style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', textAlign: 'center', padding: '24px 0' }}>기록된 지출이 없습니다</p>
      )}
    </div>
  );
}
