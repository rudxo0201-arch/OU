'use client';
import { DOMAINS } from '@/lib/ou-registry';

import { useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

/**
 * 프로필 뷰
 * 참고: GitHub 프로필, Apple 연락처, Linear 프로필
 * - 아바타 + 기본 정보
 * - 도메인별 분포 (바 차트)
 * - 활동 히트맵 (GitHub 잔디 스타일)
 * - 최근 활동 요약
 */

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '지출', task: '할 일',
  emotion: '감정', idea: '아이디어', habit: '습관',
  knowledge: '지식', relation: '인물', media: '미디어',
  product: '제품', education: '교육', location: '장소',
};

const DOMAIN_ICONS: Record<string, string> = {
  schedule: '📅', finance: '💰', task: '☑',
  emotion: '💭', idea: '💡', habit: '🔄',
  knowledge: '📖', relation: '👤', media: '🎬',
};

export function ProfileView({ nodes }: ViewProps) {
  const people = useMemo(() =>
    nodes
      .filter(n => n.domain === DOMAINS.RELATION)
      .map(n => ({
        id: n.id,
        name: (n.domain_data?.name as string) || (n.raw ?? '').slice(0, 20) || '인물',
        job: (n.domain_data?.job as string) || (n.domain_data?.occupation as string) || '',
        relationship: (n.domain_data?.relationship as string) || '',
        note: (n.domain_data?.note as string) || '',
      })),
  [nodes]);

  const stats = useMemo(() => {
    const domainCounts: Record<string, number> = {};
    const weeklyActivity: Record<string, number> = {};
    let earliest = dayjs();
    let latest = dayjs('2000-01-01');

    for (const n of nodes) {
      const d = n.domain || 'unknown';
      domainCounts[d] = (domainCounts[d] || 0) + 1;

      if (n.created_at) {
        const date = dayjs(n.created_at);
        const weekKey = date.format('YYYY-[W]ww');
        weeklyActivity[weekKey] = (weeklyActivity[weekKey] || 0) + 1;
        if (date.isBefore(earliest)) earliest = date;
        if (date.isAfter(latest)) latest = date;
      }
    }

    // 최근 7일 활동
    const recentDays: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day');
      const key = d.format('YYYY-MM-DD');
      const count = nodes.filter(n => n.created_at && dayjs(n.created_at).format('YYYY-MM-DD') === key).length;
      recentDays.push({ date: d.format('ddd'), count });
    }
    const maxDaily = Math.max(...recentDays.map(d => d.count), 1);

    // 연속 기록일
    let streak = 0;
    let d = dayjs();
    while (true) {
      const key = d.format('YYYY-MM-DD');
      const hasActivity = nodes.some(n => n.created_at && dayjs(n.created_at).format('YYYY-MM-DD') === key);
      if (!hasActivity) break;
      streak++;
      d = d.subtract(1, 'day');
    }

    return {
      total: nodes.length,
      domains: Object.entries(domainCounts).sort(([, a], [, b]) => b - a),
      daysSinceFirst: latest.diff(earliest, 'day'),
      recentDays,
      maxDaily,
      streak,
    };
  }, [nodes]);

  return (
    <div style={{ padding: '24px 32px 40px', width: '100%', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
      {/* Profile header */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '28px 20px',
        borderRadius: 16,
        border: '1px solid var(--ou-glass-border)',
        background: 'var(--ou-glass)',
        boxShadow: 'var(--ou-shadow-card)',
        marginBottom: 24,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--ou-glass)',
          boxShadow: 'var(--ou-shadow-sm)',
          border: '1px solid var(--ou-glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, color: 'var(--ou-text-muted)',
          marginBottom: 14,
        }}>
          OU
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ou-text-heading)' }}>
          내 데이터 우주
        </div>
        <div style={{
          display: 'flex', gap: 20, marginTop: 16,
        }}>
          <StatItem value={stats.total} label="DataNode" />
          <StatItem value={stats.domains.length} label="도메인" />
          <StatItem value={stats.streak} label="연속일" />
        </div>
      </div>

      {/* Weekly activity (mini bar chart) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-heading)', marginBottom: 12 }}>
          최근 7일 활동
        </div>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 6,
          height: 60, padding: '0 4px',
        }}>
          {stats.recentDays.map((day, i) => (
            <div key={i} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4,
            }}>
              <div style={{
                width: '100%', borderRadius: 3,
                height: Math.max(4, (day.count / stats.maxDaily) * 48),
                background: day.count > 0 ? 'var(--ou-text-muted)' : 'var(--ou-border-faint)',
                transition: '300ms ease',
              }} />
              <span style={{ fontSize: 9, color: 'var(--ou-text-disabled)' }}>{day.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Domain distribution */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-heading)', marginBottom: 12 }}>
          도메인별 분포
        </div>
        {stats.domains.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>데이터가 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.domains.map(([domain, count]) => {
              const ratio = stats.total > 0 ? count / stats.total : 0;
              return (
                <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
                    {DOMAIN_ICONS[domain] || '◉'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ou-text-body)', width: 50, flexShrink: 0 }}>
                    {DOMAIN_LABELS[domain] || domain}
                  </span>
                  <div style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: 'var(--ou-border-faint)', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${ratio * 100}%`, height: '100%',
                      borderRadius: 3, background: 'var(--ou-text-muted)',
                      transition: '300ms ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', width: 28, textAlign: 'right' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 인물 섹션 */}
      {people.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-heading)', marginBottom: 12 }}>
            인물 <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ou-text-muted)' }}>{people.length}명</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 10,
          }}>
            {people.map(person => (
              <div key={person.id} style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid var(--ou-glass-border)',
                background: 'var(--ou-glass)',
                boxShadow: 'var(--ou-shadow-sm)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--ou-space-subtle)',
                  border: '1px solid var(--ou-glass-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: 'var(--ou-text-muted)',
                  marginBottom: 10,
                }}>
                  {person.name.slice(0, 1)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-heading)', marginBottom: 3 }}>
                  {person.name}
                </div>
                {person.job && (
                  <div style={{ fontSize: 11, color: 'var(--ou-text-secondary)', marginBottom: 2 }}>{person.job}</div>
                )}
                {person.relationship && (
                  <div style={{ fontSize: 10, color: 'var(--ou-text-muted)' }}>{person.relationship}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ou-text-heading)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
