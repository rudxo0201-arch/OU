'use client';

import { getUserRank, getRankProgress, getNodesUntilNextRank } from '@/lib/utils/rank';

interface RankBadgeProps {
  nodeCount: number;
  /** compact: 사이드바용, full: 프로필/설정용 */
  variant?: 'compact' | 'full';
}

export function RankBadge({ nodeCount, variant = 'compact' }: RankBadgeProps) {
  const rank = getUserRank(nodeCount);
  const progress = getRankProgress(nodeCount);
  const remaining = getNodesUntilNextRank(nodeCount);

  if (variant === 'compact') {
    return (
      <div
        title={
          remaining > 0
            ? `${rank.description} \u00b7 다음 등급까지 ${remaining}개`
            : rank.description
        }
        style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', cursor: 'default' }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{rank.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rank.name}</span>
          <div
            style={{
              width: '100%',
              height: 3,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
              marginTop: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: 999,
                background: 'var(--ou-text-muted, rgba(255,255,255,0.4))',
                transition: 'width 300ms ease',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // full variant
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{rank.emoji}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{rank.name}</span>
          <span style={{ fontSize: 12, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))' }}>{rank.nameEn}</span>
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))' }}>{rank.description}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            width: '100%',
            height: 6,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 999,
              background: 'var(--ou-text-muted, rgba(255,255,255,0.4))',
              transition: 'width 300ms ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))' }}>{nodeCount}개 기록</span>
          {remaining > 0 ? (
            <span style={{ fontSize: 10, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))' }}>다음 등급까지 {remaining}개</span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))' }}>최고 등급 달성</span>
          )}
        </div>
      </div>
    </div>
  );
}
