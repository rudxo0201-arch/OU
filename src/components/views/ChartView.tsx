'use client';

import { useState, useMemo } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

/**
 * 지출 차트 뷰 — 뱅크샐러드 / YNAB 참고
 * - 카테고리별 바 차트
 * - 최근 거래 내역 (44px 아이템)
 * - 월별 전환
 */

const CATEGORY_SHADES: Record<string, string> = {
  '식비':   'rgba(255,180,100,0.85)',
  '교통':   'rgba(100,180,255,0.85)',
  '쇼핑':   'rgba(255,120,160,0.85)',
  '문화':   'rgba(160,120,255,0.85)',
  '의료':   'rgba(100,220,160,0.85)',
  '교육':   'rgba(255,240,100,0.85)',
  '주거':   'rgba(160,210,255,0.85)',
  '통신':   'rgba(200,200,200,0.85)',
  '여가':   'rgba(255,150,190,0.85)',
  '기타':   'rgba(150,150,150,0.85)',
};

const DEFAULT_COLOR = 'rgba(150,150,150,0.85)';

interface SpendingItem {
  id: string;
  amount: number;
  category: string;
  date: string;
  title: string;
}

function parseSpending(nodes: ViewProps['nodes']): SpendingItem[] {
  const result: SpendingItem[] = [];
  for (const n of nodes) {
    if (n.domain !== 'finance' || !n.domain_data) continue;
    if (Array.isArray(n.domain_data.items)) {
      for (const it of n.domain_data.items) {
        result.push({
          id: n.id,
          amount: Number(it.amount) || 0,
          category: it.category ?? '기타',
          date: n.domain_data.date ?? n.created_at ?? '',
          title: it.name || it.title || '지출',
        });
      }
    } else if (n.domain_data.amount != null) {
      result.push({
        id: n.id,
        amount: Number(n.domain_data.amount) || 0,
        category: n.domain_data.category ?? '기타',
        date: n.domain_data.date ?? n.created_at ?? '',
        title: n.domain_data.title || (n.raw ?? '').slice(0, 30) || '지출',
      });
    }
  }
  return result.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function ChartView({ nodes, inline }: ViewProps & { inline?: boolean }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const currentMonth = dayjs().subtract(monthOffset, 'month');

  const allItems = useMemo(() => parseSpending(nodes), [nodes]);

  const monthItems = useMemo(() =>
    allItems.filter(it => it.date && dayjs(it.date).format('YYYY-MM') === currentMonth.format('YYYY-MM')),
  [allItems, currentMonth]);

  const totalAmount = monthItems.reduce((sum, it) => sum + it.amount, 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of monthItems) {
      map[it.category] = (map[it.category] ?? 0) + it.amount;
    }
    return Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [monthItems]);

  const maxCatAmount = Math.max(...byCategory.map(([, v]) => v), 1);

  // 인라인
  if (inline) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px',
        borderRadius: 10,
        boxShadow: 'var(--ou-neu-pressed-sm)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--ou-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          지출
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ou-text-body)' }}>
          {totalAmount.toLocaleString()}원
        </span>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--ou-text-disabled)', fontSize: 14 }}>
        지출 기록이 없습니다. "커피 4500원" 처럼 말해보세요.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>

      {/* Month navigation + 총액 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 32,
      }}>
        <button
          onClick={() => setMonthOffset(m => m + 1)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ou-text-secondary)', borderRadius: 8,
          }}
        >
          <CaretLeft size={16} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ou-text-secondary)', marginBottom: 4 }}>
            {currentMonth.format('YYYY년 M월')}
          </div>
          <div style={{
            fontSize: 28, fontWeight: 700,
            color: 'var(--ou-text-strong)',
            letterSpacing: '-0.03em',
            fontFamily: 'var(--ou-font-logo)',
          }}>
            ₩{totalAmount.toLocaleString('ko-KR')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)', marginTop: 4 }}>
            {monthItems.length}건
          </div>
        </div>

        <button
          onClick={() => setMonthOffset(m => Math.max(0, m - 1))}
          disabled={monthOffset === 0}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32,
            background: 'none', border: 'none',
            cursor: monthOffset === 0 ? 'default' : 'pointer',
            color: 'var(--ou-text-secondary)', borderRadius: 8,
            opacity: monthOffset === 0 ? 0.3 : 1,
          }}
        >
          <CaretRight size={16} />
        </button>
      </div>

      {/* 카테고리 바 */}
      {byCategory.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--ou-text-disabled)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            카테고리
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {byCategory.map(([category, amount]) => {
              const percent = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(0) : '0';
              const color = CATEGORY_SHADES[category] ?? DEFAULT_COLOR;
              return (
                <div key={category}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: color, flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 13, color: 'var(--ou-text-body)' }}>{category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--ou-text-secondary)' }}>
                        {amount.toLocaleString()}원
                      </span>
                      <span style={{
                        fontSize: 11, color: 'var(--ou-text-disabled)',
                        fontFamily: 'var(--ou-font-mono)',
                        minWidth: 28, textAlign: 'right',
                      }}>
                        {percent}%
                      </span>
                    </div>
                  </div>
                  <div style={{
                    height: 6, borderRadius: 3,
                    background: 'var(--ou-surface-subtle)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${(amount / maxCatAmount) * 100}%`,
                      background: color,
                      transition: '400ms ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 최근 거래 */}
      <div>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: 'var(--ou-text-disabled)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          최근 거래
        </div>
        {monthItems.slice(0, 20).map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              height: 52,
              padding: '0 12px',
              borderRadius: 8,
              transition: 'background 100ms ease',
              borderBottom: i < monthItems.slice(0, 20).length - 1
                ? '1px solid var(--ou-border-faint)' : 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--ou-surface-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: CATEGORY_SHADES[item.category] ?? DEFAULT_COLOR,
              }} />
              <div>
                <div style={{ fontSize: 14, color: 'var(--ou-text-body)', letterSpacing: '-0.01em' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)', marginTop: 1 }}>
                  {item.category}
                  {item.date ? ` · ${dayjs(item.date).format('M/D')}` : ''}
                </div>
              </div>
            </div>
            <span style={{
              fontSize: 14, fontWeight: 500,
              color: 'var(--ou-text-body)',
              fontFamily: 'var(--ou-font-mono)',
              letterSpacing: '-0.01em',
            }}>
              -{item.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
