'use client';

import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

/**
 * 지출 차트 뷰
 * 참고: 뱅크샐러드, Mint, YNAB
 * - 도넛 차트 (카테고리별 비율)
 * - 카테고리별 바 차트
 * - 월별 전환
 * - 최근 거래 내역
 */

const CATEGORIES = ['식비', '교통', '쇼핑', '문화', '의료', '교육', '주거', '통신', '여가', '기타'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  '식비': 'rgba(255,180,120,0.8)',
  '교통': 'rgba(120,180,255,0.8)',
  '쇼핑': 'rgba(255,120,180,0.8)',
  '문화': 'rgba(180,120,255,0.8)',
  '의료': 'rgba(120,255,180,0.8)',
  '교육': 'rgba(255,255,120,0.8)',
  '주거': 'rgba(180,220,255,0.8)',
  '통신': 'rgba(200,200,200,0.8)',
  '여가': 'rgba(255,160,200,0.8)',
  '기타': 'rgba(160,160,160,0.8)',
};

interface SpendingItem {
  id: string;
  amount: number;
  category: string;
  date: string;
  title: string;
}

function parseSpending(nodes: any[]): SpendingItem[] {
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

// SVG 도넛 차트
function DonutChart({ data, total }: { data: [string, number][]; total: number }) {
  const size = 160;
  const radius = 60;
  const strokeWidth = 20;
  let offset = 0;
  const circumference = 2 * Math.PI * radius;

  if (data.length === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--ou-border-faint)" strokeWidth={strokeWidth} />
        <text x={size/2} y={size/2} textAnchor="middle" dy="0.35em" fill="var(--ou-text-dimmed)" fontSize="12">데이터 없음</text>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {data.map(([category, amount]) => {
        const ratio = total > 0 ? amount / total : 0;
        const dash = ratio * circumference;
        const gap = circumference - dash;
        const el = (
          <circle
            key={category}
            cx={size/2} cy={size/2} r={radius}
            fill="none"
            stroke={CATEGORY_COLORS[category] || 'rgba(160,160,160,0.8)'}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transition: '300ms ease' }}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
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
      const cat = CATEGORIES.includes(it.category as any) ? it.category : '기타';
      map[cat] = (map[cat] ?? 0) + it.amount;
    }
    return Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [monthItems]);

  const maxCatAmount = Math.max(...byCategory.map(([, v]) => v), 1);

  // 인라인
  if (inline) {
    return (
      <div style={{
        padding: '10px 14px',
        border: 'none',
        borderRadius: 'var(--ou-radius-md, 8px)',
        boxShadow: 'var(--ou-neu-pressed-sm)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', letterSpacing: 1 }}>SPENDING</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ou-text-strong)' }}>
            {totalAmount.toLocaleString()}원
          </span>
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-dimmed)', fontSize: 13 }}>
        지출 기록이 없습니다. Orb에 "커피 4500원" 같이 말해보세요.
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 560, margin: '0 auto' }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => setMonthOffset(m => m + 1)} style={{ cursor: 'pointer', padding: 4, color: 'var(--ou-text-dimmed)' }}>◀</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ou-text-strong)' }}>{currentMonth.format('YYYY년 M월')}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ou-text-strong)', marginTop: 4 }}>{totalAmount.toLocaleString()}원</div>
        </div>
        <button onClick={() => setMonthOffset(m => Math.max(0, m - 1))} disabled={monthOffset === 0}
          style={{ cursor: monthOffset === 0 ? 'default' : 'pointer', padding: 4, color: 'var(--ou-text-dimmed)', opacity: monthOffset === 0 ? 0.3 : 1 }}>▶</button>
      </div>

      {/* Donut chart */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, padding: 16, borderRadius: 12, boxShadow: 'var(--ou-neu-raised-sm)' }}>
        <DonutChart data={byCategory} total={totalAmount} />
      </div>

      {/* Category bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {byCategory.map(([category, amount]) => {
          const percent = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(0) : '0';
          return (
            <div key={category}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[category] || '#888' }} />
                  <span style={{ fontSize: 12, color: 'var(--ou-text-secondary)' }}>{category}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>{amount.toLocaleString()}원 ({percent}%)</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--ou-border-faint)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${(amount / maxCatAmount) * 100}%`,
                  background: CATEGORY_COLORS[category] || '#888',
                  transition: '300ms ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent transactions */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-strong)', marginBottom: 10 }}>최근 거래</div>
        {monthItems.slice(0, 10).map((item, i) => (
          <div key={`${item.id}-${i}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px',
            marginBottom: 6,
            borderRadius: 8,
            boxShadow: 'var(--ou-neu-raised-sm)',
          }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>{item.title}</div>
              <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 2 }}>
                {item.category} · {item.date ? dayjs(item.date).format('M/D') : ''}
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ou-text-strong)' }}>
              -{item.amount.toLocaleString()}원
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
