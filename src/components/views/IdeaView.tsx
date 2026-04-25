'use client';
import { DOMAINS } from '@/lib/ou-registry';

import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';

const STAGES = [
  { key: 'seed', label: '씨앗', description: '막 떠오른 아이디어' },
  { key: 'sprout', label: '발아', description: '구체화 시작' },
  { key: 'grow', label: '성장', description: '발전 중' },
  { key: 'harvest', label: '수확', description: '실행 가능' },
] as const;

function getStage(node: ViewProps['nodes'][number]): string {
  if (node.domain_data?.stage) return node.domain_data.stage;
  const rawLen = (node.raw || '').length;
  if (rawLen > 200) return 'grow';
  if (rawLen > 80) return 'sprout';
  return 'seed';
}

export function IdeaView({ nodes }: ViewProps) {
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  // 편집 상태
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editStage, setEditStage] = useState('');
  const [saving, setSaving] = useState(false);
  // 로컬 업데이트 (저장 후 즉시 반영)
  const [localUpdates, setLocalUpdates] = useState<Record<string, { raw?: string; stage?: string }>>({});

  const ideas = useMemo(() =>
    nodes
      .filter(n => n.domain === DOMAINS.IDEA)
      .map(n => {
        const update = localUpdates[n.id];
        return {
          id: n.id,
          title: n.domain_data?.title || (update?.raw ?? n.raw ?? '').slice(0, 40) || '아이디어',
          content: update?.raw ?? n.raw ?? '',
          stage: update?.stage ?? getStage(n),
          createdAt: n.created_at,
          domainData: n.domain_data,
        };
      }),
  [nodes, localUpdates]);

  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.stage === filter);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const idea of ideas) counts[idea.stage] = (counts[idea.stage] || 0) + 1;
    return counts;
  }, [ideas]);

  const startEdit = (idea: typeof ideas[number], e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(idea.id);
    setEditContent(idea.content);
    setEditStage(idea.stage);
    setExpanded(idea.id);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(null);
  };

  const saveEdit = async (id: string, domainData: Record<string, unknown> | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw: editContent,
          domain_data: { ...(domainData || {}), stage: editStage },
        }),
      });
      if (res.ok) {
        setLocalUpdates(prev => ({ ...prev, [id]: { raw: editContent, stage: editStage } }));
        setEditing(null);
      }
    } finally {
      setSaving(false);
    }
  };

  if (ideas.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
        아이디어가 없습니다. 채팅에서 아이디어를 말해보세요.
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Stage filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <FilterChip label={`전체 ${ideas.length}`} active={filter === 'all'} onClick={() => setFilter('all')} />
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
      }}>
        {filtered.map(idea => (
          <div
            key={idea.id}
            onClick={() => editing !== idea.id && setExpanded(expanded === idea.id ? null : idea.id)}
            style={{
              padding: 16,
              borderRadius: 12,
              border: `1px solid ${expanded === idea.id ? 'var(--ou-glass-border-hover)' : 'var(--ou-glass-border)'}`,
              background: 'var(--ou-glass)',
              boxShadow: expanded === idea.id ? 'var(--ou-shadow-md)' : 'var(--ou-shadow-sm)',
              cursor: editing === idea.id ? 'default' : 'pointer',
              transition: '150ms ease',
            }}
          >
            {/* Stage badge + edit 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              {editing === idea.id ? (
                <select
                  value={editStage}
                  onChange={e => setEditStage(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 6,
                    border: '1px solid var(--ou-glass-border)',
                    background: 'var(--ou-glass)', fontFamily: 'inherit',
                    color: 'var(--ou-text-muted)',
                  }}
                >
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              ) : (
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 999,
                  border: '1px solid var(--ou-glass-border)',
                  color: 'var(--ou-text-muted)',
                }}>
                  {STAGES.find(s => s.key === idea.stage)?.label || idea.stage}
                </span>
              )}
              {!editing && expanded === idea.id && (
                <button
                  onClick={e => startEdit(idea, e)}
                  style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 6,
                    border: '1px solid var(--ou-glass-border)',
                    background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    color: 'var(--ou-text-muted)',
                  }}
                >
                  편집
                </button>
              )}
            </div>

            {/* Title */}
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ou-text-heading)', marginBottom: 6 }}>
              {idea.title}
            </div>

            {/* Content (편집 모드 시 textarea) */}
            {editing === idea.id ? (
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onClick={e => e.stopPropagation()}
                rows={5}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--ou-glass-border-focus)',
                  background: 'var(--ou-glass)', fontFamily: 'inherit',
                  fontSize: 12, color: 'var(--ou-text-body)', resize: 'vertical',
                  lineHeight: 1.6,
                }}
              />
            ) : (
              <div style={{
                fontSize: 12, color: 'var(--ou-text-muted)',
                lineHeight: 1.6,
                overflow: 'hidden',
                display: expanded === idea.id ? 'block' : '-webkit-box',
                WebkitLineClamp: expanded === idea.id ? undefined : 3,
                WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
              }}>
                {idea.content}
              </div>
            )}

            {/* 편집 모드 액션 버튼 */}
            {editing === idea.id && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={e => saveEdit(idea.id, idea.domainData as Record<string, unknown> | undefined, e)}
                  disabled={saving}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                    background: 'var(--ou-accent)', color: 'rgba(255,255,255,0.92)',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                    cursor: saving ? 'default' : 'pointer',
                  }}
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    padding: '7px 14px', borderRadius: 8,
                    border: '1px solid var(--ou-glass-border)',
                    background: 'none', fontFamily: 'inherit', fontSize: 12,
                    cursor: 'pointer', color: 'var(--ou-text-muted)',
                  }}
                >
                  취소
                </button>
              </div>
            )}

            {/* Date */}
            {idea.createdAt && !editing && (
              <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginTop: 8 }}>
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
        border: `1px solid ${active ? 'var(--ou-glass-border-hover)' : 'var(--ou-glass-border)'}`,
        background: active ? 'var(--ou-accent)' : 'var(--ou-glass)',
        color: active ? 'rgba(255,255,255,0.92)' : 'var(--ou-text-muted)',
        cursor: 'pointer', transition: '150ms ease',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}
