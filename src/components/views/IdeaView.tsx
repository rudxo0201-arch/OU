'use client';

import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';

/**
 * 아이디어 뷰
 * 참고: Pinterest 보드, Miro 스티키노트, Apple Freeform
 * - 카드 그리드 (masonry 느낌)
 * - 발전 단계 태그 (씨앗 → 발아 → 성장 → 수확)
 * - 클릭 시 확장 카드
 */

const STAGES = [
  { key: 'seed', label: '씨앗', description: '막 떠오른 아이디어' },
  { key: 'sprout', label: '발아', description: '구체화 시작' },
  { key: 'grow', label: '성장', description: '발전 중' },
  { key: 'harvest', label: '수확', description: '실행 가능' },
] as const;

function getStage(node: any): string {
  // domain_data에 stage가 있으면 사용, 없으면 내용 길이로 추정
  if (node.domain_data?.stage) return node.domain_data.stage;
  const rawLen = (node.raw || '').length;
  if (rawLen > 200) return 'grow';
  if (rawLen > 80) return 'sprout';
  return 'seed';
}

export function IdeaView({ nodes }: ViewProps) {
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const ideas = useMemo(() =>
    nodes
      .filter(n => n.domain === 'idea')
      .map(n => ({
        id: n.id,
        title: n.domain_data?.title || (n.raw ?? '').slice(0, 40) || '아이디어',
        content: n.raw || '',
        stage: getStage(n),
        createdAt: n.created_at,
        tags: n.system_tags || [],
      })),
  [nodes]);

  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.stage === filter);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const idea of ideas) {
      counts[idea.stage] = (counts[idea.stage] || 0) + 1;
    }
    return counts;
  }, [ideas]);

  if (ideas.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-dimmed, #888)', fontSize: 13 }}>
        아이디어가 없습니다. 채팅에서 아이디어를 말해보세요.
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Stage filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <FilterChip
          label={`전체 ${ideas.length}`}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        {STAGES.map(s => (
          <FilterChip
            key={s.key}
            label={`${s.label} ${stageCounts[s.key] || 0}`}
            active={filter === s.key}
            onClick={() => setFilter(s.key)}
          />
        ))}
      </div>

      {/* Idea cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220, 1fr))',
        gap: 12,
      }}>
        {filtered.map(idea => (
          <div
            key={idea.id}
            onClick={() => setExpanded(expanded === idea.id ? null : idea.id)}
            style={{
              padding: 16,
              borderRadius: 12,
              border: expanded === idea.id
                ? '1px solid rgba(255,255,255,0.2)'
                : '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              transition: '150ms ease',
            }}
          >
            {/* Stage badge */}
            <div style={{ marginBottom: 8 }}>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 999,
                border: '0.5px solid rgba(255,255,255,0.1)',
                color: 'var(--ou-text-dimmed, #888)',
              }}>
                {STAGES.find(s => s.key === idea.stage)?.label || idea.stage}
              </span>
            </div>

            {/* Title */}
            <div style={{
              fontSize: 14, fontWeight: 500,
              color: 'var(--ou-text-strong, #fff)',
              marginBottom: 6,
            }}>
              {idea.title}
            </div>

            {/* Content */}
            <div style={{
              fontSize: 12, color: 'var(--ou-text-dimmed, #888)',
              lineHeight: 1.6,
              overflow: 'hidden',
              display: expanded === idea.id ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded === idea.id ? undefined : 3,
              WebkitBoxOrient: 'vertical' as any,
            }}>
              {idea.content}
            </div>

            {/* Date */}
            {idea.createdAt && (
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.25)',
                marginTop: 8,
              }}>
                {new Date(idea.createdAt).toLocaleDateString('ko-KR')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 999, fontSize: 11,
        border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: active ? 'var(--ou-text-strong, #fff)' : 'var(--ou-text-dimmed, #888)',
        cursor: 'pointer', transition: '150ms ease',
      }}
    >
      {label}
    </button>
  );
}
