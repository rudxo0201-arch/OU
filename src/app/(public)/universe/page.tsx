'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const UniverseGraph = dynamic(
  () => import('@/components/universe/UniverseGraph').then(m => ({ default: m.UniverseGraph })),
  { ssr: false, loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="ou-spinner" />
    </div>
  )}
);

interface DataNode {
  id: string;
  raw?: string;
  domain?: string;
  created_at?: string;
  domain_data?: Record<string, unknown>;
}

export default function UniversePage() {
  const [nodes, setNodes] = useState<DataNode[]>([]);
  const [selected, setSelected] = useState<DataNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/nodes?limit=500')
      .then(r => r.json())
      .then(data => { setNodes(data.nodes || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--ou-space)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 네비바 */}
      <nav style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 52,
        background: 'rgba(228,228,234,0.9)',
        borderBottom: '1px solid var(--ou-glass-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ fontFamily: 'var(--ou-font-logo)', fontSize: 16, fontWeight: 700, color: 'var(--ou-text-heading)', textDecoration: 'none' }}>
            OU
          </Link>
          <span style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>
            Universe
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
            {loading ? '로딩 중...' : `${nodes.length}개 노드`}
          </span>
          <Link href="/home" style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid var(--ou-glass-border)',
            background: 'var(--ou-glass)', fontSize: 12,
            color: 'var(--ou-text-body)', textDecoration: 'none',
          }}>
            홈으로
          </Link>
        </div>
      </nav>

      {/* 그래프 */}
      <div style={{ flex: 1, paddingTop: 52, position: 'relative' }}>
        {loading ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="ou-spinner" />
          </div>
        ) : nodes.length === 0 ? (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16,
          }}>
            <div style={{ fontSize: 48, opacity: 0.15 }}>◉</div>
            <div style={{ fontSize: 14, color: 'var(--ou-text-muted)' }}>아직 데이터가 없습니다</div>
            <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)' }}>
              OU Chat에서 대화를 시작하면 이 곳에 우주가 펼쳐집니다
            </div>
            <Link href="/home" style={{
              marginTop: 8, padding: '8px 20px',
              borderRadius: 8, border: '1px solid var(--ou-glass-border)',
              background: 'var(--ou-glass)', fontSize: 13,
              color: 'var(--ou-text-body)', textDecoration: 'none',
            }}>
              시작하기 →
            </Link>
          </div>
        ) : (
          <UniverseGraph nodes={nodes} onNodeClick={setSelected} />
        )}
      </div>

      {/* 선택된 노드 상세 패널 */}
      {selected && (
        <div style={{
          position: 'absolute', top: 52, right: 0, bottom: 0,
          width: 320,
          background: 'rgba(255,255,255,0.97)',
          borderLeft: '1px solid var(--ou-glass-border)',
          boxShadow: 'var(--ou-shadow-lg)',
          padding: '20px',
          overflowY: 'auto',
          animation: 'ou-slide-down 200ms ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 999,
              background: 'var(--ou-space-subtle)',
              color: 'var(--ou-text-secondary)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {selected.domain || 'unknown'}
            </span>
            <button
              onClick={() => setSelected(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: 'var(--ou-text-muted)', lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ fontSize: 13, color: 'var(--ou-text-body)', lineHeight: 1.7, marginBottom: 16 }}>
            {selected.raw || '(내용 없음)'}
          </div>

          {selected.created_at && (
            <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)' }}>
              {new Date(selected.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          )}
        </div>
      )}

      {/* 줌 힌트 */}
      {!loading && nodes.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 20, right: 20,
          fontSize: 10, color: 'var(--ou-text-disabled)',
          pointerEvents: 'none',
        }}>
          드래그: 이동 · 스크롤: 줌 · 클릭: 노드 상세
        </div>
      )}
    </div>
  );
}
