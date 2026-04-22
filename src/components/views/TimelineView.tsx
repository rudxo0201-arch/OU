'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

/**
 * 타임라인 뷰
 * 참고: Linear changelog, GitHub activity, Notion timeline
 * - 날짜별 수직 타임라인
 * - 도메인 뱃지
 * - 연결선으로 흐름 표시
 */

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '지출', task: '할 일',
  emotion: '감정', idea: '아이디어', habit: '습관',
  knowledge: '지식', relation: '인물', media: '미디어',
  product: '제품', education: '교육', location: '장소',
};

export function TimelineView({ nodes }: ViewProps) {
  const sorted = useMemo(() =>
    [...nodes]
      .filter(n => n.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  [nodes]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof sorted>();
    for (const node of sorted) {
      const key = dayjs(node.created_at).format('YYYY-MM-DD');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(node);
    }
    return Array.from(groups.entries());
  }, [sorted]);

  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  if (sorted.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
        타임라인에 표시할 데이터가 없습니다
      </div>
    );
  }

  const domainCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of sorted) map[n.domain] = (map[n.domain] || 0) + 1;
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 4);
  }, [sorted]);

  return (
    <div style={{ padding: '24px 32px 40px', width: '100%' }}>
      {/* 상단 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        <div style={{ background: 'var(--ou-card-dark)', borderRadius: 'var(--ou-radius-card)', padding: '16px 18px', boxShadow: 'var(--ou-shadow-md)' }}>
          <div style={{ fontSize: 11, color: 'var(--ou-card-dark-sub)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>총 데이터</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ou-card-dark-text)', letterSpacing: '-0.02em' }}>{sorted.length}</div>
        </div>
        {domainCounts.map(([domain, count]) => (
          <div key={domain} style={{ background: 'var(--ou-glass)', border: '1px solid var(--ou-glass-border)', borderRadius: 'var(--ou-radius-card)', padding: '16px 18px', boxShadow: 'var(--ou-shadow-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>{DOMAIN_LABELS[domain] || domain}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ou-text-heading)', letterSpacing: '-0.02em' }}>{count}</div>
          </div>
        ))}
      </div>
      {grouped.map(([dateStr, items]) => {
        const label = dateStr === today ? '오늘'
          : dateStr === yesterday ? '어제'
          : dayjs(dateStr).format('M월 D일 (ddd)');

        return (
          <div key={dateStr} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, marginBottom: 12,
              color: dateStr === today ? 'var(--ou-text-strong, #fff)' : 'var(--ou-text-dimmed, #888)',
            }}>
              {label}
            </div>

            {items.map((node, i) => (
              <div key={node.id} style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  width: 20, flexShrink: 0,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    border: '1.5px solid var(--ou-border-subtle)',
                    background: 'var(--ou-bg)',
                    flexShrink: 0, marginTop: 6,
                  }} />
                  {i < items.length - 1 && (
                    <div style={{ width: 1, flex: 1, minHeight: 20, background: 'var(--ou-border-faint)' }} />
                  )}
                </div>

                <div style={{ flex: 1, paddingBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 4,
                      border: '0.5px solid var(--ou-border-subtle)',
                      color: 'var(--ou-text-muted)',
                    }}>
                      {DOMAIN_LABELS[node.domain] || node.domain}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)' }}>
                      {dayjs(node.created_at).format('HH:mm')}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13, color: 'var(--ou-text-body)',
                    lineHeight: 1.6, overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as any,
                  }}>
                    {node.domain_data?.title || (node.raw ?? '').slice(0, 80) || '데이터'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
