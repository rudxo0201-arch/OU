'use client';

import { useState, useEffect } from 'react';

interface DataNode {
  id: string;
  domain: string;
  raw?: string;
  domain_data?: Record<string, string>;
  created_at: string;
}

const DOMAIN_BADGE: Record<string, string> = {
  schedule: '일정', task: '할일', finance: '지출', relation: '사람',
  location: '장소', idea: '아이디어', habit: '습관', knowledge: '지식',
  media: '미디어', health: '건강', education: '교육', development: '개발',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간`;
  const d = Math.floor(h / 24);
  if (d === 1) return '어제';
  return `${d}일`;
}

function getNodeSummary(node: DataNode): string {
  if (node.domain_data?.title) return node.domain_data.title;
  if (node.domain_data?.name) return node.domain_data.name;
  if (node.raw) return node.raw.slice(0, 30) + (node.raw.length > 30 ? '...' : '');
  return '—';
}

export function RecentNodesWidget() {
  const [nodes, setNodes] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/nodes?limit=15')
      .then(r => r.json())
      .then(d => { setNodes(d.nodes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: 'var(--ou-text-dimmed)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
          fontFamily: 'var(--ou-font-logo)',
        }}>
          최근 기억
        </span>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--ou-accent)',
          animation: 'blink 2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 9, color: 'var(--ou-accent)', fontWeight: 600, letterSpacing: '0.06em' }}>
          LIVE
        </span>
      </div>

      {/* 리스트 */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', paddingTop: 8 }}>불러오는 중...</div>
        ) : nodes.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', paddingTop: 8 }}>
            아직 기억이 없어요. Orb에서 말해보세요.
          </div>
        ) : nodes.map(node => (
          <div key={node.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 0',
            borderBottom: '1px solid var(--ou-border-faint)',
          }}>
            {/* 시간 */}
            <span style={{
              fontSize: 10, color: 'var(--ou-text-dimmed)',
              fontFamily: 'var(--ou-font-mono)',
              flexShrink: 0, width: 26, textAlign: 'right',
            }}>
              {relativeTime(node.created_at)}
            </span>

            {/* 도메인 뱃지 */}
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: 'var(--ou-text-muted)',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-xs)',
              padding: '2px 7px',
              borderRadius: 999,
              flexShrink: 0,
              letterSpacing: '0.02em',
            }}>
              {DOMAIN_BADGE[node.domain] || node.domain}
            </span>

            {/* 내용 */}
            <span style={{
              fontSize: 12, color: 'var(--ou-text-body)',
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', flex: 1,
            }}>
              {getNodeSummary(node)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
