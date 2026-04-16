'use client';

import { useState, useMemo } from 'react';
import { CalendarBlank, CurrencyCircleDollar, Users, Smiley } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import isBetween from 'dayjs/plugin/isBetween';
import type { ViewProps } from './registry';

dayjs.locale('ko');
dayjs.extend(isBetween);

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', task: '할 일', habit: '습관', knowledge: '지식',
  idea: '아이디어', relation: '관계', emotion: '감정', finance: '가계',
  product: '상품', broadcast: '방송', education: '교육', media: '미디어',
  location: '장소', unresolved: '미분류',
};

export function SnapshotView({ nodes }: ViewProps) {
  const [startDate, setStartDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  const filtered = useMemo(() => {
    if (!startDate || !endDate) return nodes;
    const s = dayjs(startDate).startOf('day');
    const e = dayjs(endDate).endOf('day');
    return nodes.filter(n => {
      const d = n.domain_data?.date ?? n.created_at;
      if (!d) return false;
      return dayjs(d).isBetween(s, e, null, '[]');
    });
  }, [nodes, startDate, endDate]);

  const domainBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of filtered) {
      const domain = n.domain ?? 'unresolved';
      map[domain] = (map[domain] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const totalSpending = useMemo(() => {
    let sum = 0;
    for (const n of filtered) {
      if (n.domain !== 'finance') continue;
      const dd = n.domain_data ?? {};
      const amount = parseFloat(dd.amount ?? dd.price ?? '0');
      if (!isNaN(amount)) sum += Math.abs(amount);
    }
    return sum;
  }, [filtered]);

  const topPeople = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of filtered) {
      if (n.domain !== 'relation') continue;
      const name = n.domain_data?.name ?? '';
      if (!name) continue;
      map[name] = (map[name] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const topEmotions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of filtered) {
      if (n.domain !== 'emotion') continue;
      const emotion = n.domain_data?.emotion ?? n.domain_data?.mood ?? '';
      if (!emotion) continue;
      map[emotion] = (map[emotion] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const timeline = useMemo(() => {
    return filtered
      .filter(n => n.domain_data?.title || n.domain_data?.name)
      .sort((a, b) => {
        const da = a.domain_data?.date ?? a.created_at ?? '';
        const db = b.domain_data?.date ?? b.created_at ?? '';
        return da > db ? -1 : 1;
      })
      .slice(0, 10)
      .map(n => ({
        id: n.id,
        date: n.domain_data?.date ?? n.created_at ?? '',
        title: n.domain_data?.title ?? n.domain_data?.name ?? '',
        domain: n.domain ?? 'unresolved',
      }));
  }, [filtered]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16 }}>
      {/* Date range */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginBottom: 4 }}>시작일</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ padding: '6px 8px', fontSize: 12, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', color: 'inherit' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', paddingBottom: 6 }}>~</span>
        <div>
          <label style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginBottom: 4 }}>종료일</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ padding: '6px 8px', fontSize: 12, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', color: 'inherit' }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        <div style={{ padding: '8px 12px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 8 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 2, alignItems: 'center' }}>
            <CalendarBlank size={12} />
            <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>전체 기록</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{filtered.length}건</span>
        </div>
        {totalSpending > 0 && (
          <div style={{ padding: '8px 12px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 2, alignItems: 'center' }}>
              <CurrencyCircleDollar size={12} />
              <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>총 지출</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{totalSpending.toLocaleString()}원</span>
          </div>
        )}
        {domainBreakdown.map(([domain, count]) => (
          <div key={domain} style={{ padding: '8px 12px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', display: 'block' }}>{DOMAIN_LABELS[domain] ?? domain}</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{count}</span>
          </div>
        ))}
      </div>

      {/* Top people */}
      {topPeople.length > 0 && (
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
            <Users size={14} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>이 시기에 자주 만난 사람</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {topPeople.map(([name, count]) => (
              <span key={name} style={{ fontSize: 10, padding: '2px 8px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4 }}>
                {name} ({count}회)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Emotions */}
      {topEmotions.length > 0 && (
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
            <Smiley size={14} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>감정 요약</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {topEmotions.map(([emotion, count]) => (
              <span key={emotion} style={{ fontSize: 10, padding: '2px 8px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4 }}>
                {emotion} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <>
          <div style={{ borderTop: '0.5px solid var(--ou-border, #333)' }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 12 }}>주요 기록</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {timeline.map(item => (
                <div key={item.id} style={{ display: 'flex', padding: '8px 12px', gap: 12, flexWrap: 'nowrap', alignItems: 'center', border: '0.5px solid var(--ou-border, #333)', borderRadius: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', width: 56, flexShrink: 0 }}>
                    {item.date ? dayjs(item.date).format('MM.DD') : ''}
                  </span>
                  <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4, flexShrink: 0 }}>
                    {DOMAIN_LABELS[item.domain] ?? item.domain}
                  </span>
                  <span style={{ fontSize: 11, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
