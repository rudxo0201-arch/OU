'use client';

import { useMemo } from 'react';
import type { ViewProps } from './registry';

/**
 * 프로필 뷰
 * 참고: Apple 연락처, LinkedIn 프로필, iOS 설정
 * - 프로필 카드 (아바타, 이름, 소개)
 * - 통계 (노드 수, 도메인별 분포)
 * - 최근 활동
 */

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '지출', task: '할 일',
  emotion: '감정', idea: '아이디어', habit: '습관',
  knowledge: '지식', relation: '인물', media: '미디어',
  product: '제품', education: '교육', location: '장소',
};

export function ProfileView({ nodes }: ViewProps) {
  const stats = useMemo(() => {
    const domainCounts: Record<string, number> = {};
    for (const n of nodes) {
      const d = n.domain || 'unknown';
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
    return {
      total: nodes.length,
      domains: Object.entries(domainCounts)
        .sort(([, a], [, b]) => b - a),
    };
  }, [nodes]);

  return (
    <div style={{ padding: '24px', maxWidth: 480, margin: '0 auto' }}>
      {/* Profile card */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 20px',
        borderRadius: 16,
        border: '1px solid var(--ou-border-subtle, rgba(255,255,255,0.08))',
        background: 'rgba(255,255,255,0.02)',
        marginBottom: 24,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: 'rgba(255,255,255,0.4)',
          marginBottom: 12,
        }}>
          OU
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ou-text-strong, #fff)' }}>
          내 데이터 우주
        </div>
        <div style={{ fontSize: 12, color: 'var(--ou-text-dimmed, #888)', marginTop: 4 }}>
          {stats.total}개의 DataNode
        </div>
      </div>

      {/* Domain stats */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-strong, #fff)', marginBottom: 12 }}>
          도메인별 분포
        </h3>
        {stats.domains.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ou-text-dimmed, #888)' }}>데이터가 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.domains.map(([domain, count]) => {
              const ratio = stats.total > 0 ? count / stats.total : 0;
              return (
                <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--ou-text-secondary, #ccc)', width: 60, flexShrink: 0 }}>
                    {DOMAIN_LABELS[domain] || domain}
                  </span>
                  <div style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: 'rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${ratio * 100}%`, height: '100%',
                      borderRadius: 3,
                      background: 'rgba(255,255,255,0.25)',
                      transition: '300ms ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', width: 30, textAlign: 'right' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
