'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface DataNode {
  id: string;
  domain?: string;
  raw?: string;
  label?: string;
  createdAt?: string;
  [key: string]: unknown;
}

interface DataCardPanelProps {
  itemId: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', task: '할일', habit: '습관', journal: '일기',
  note: '노트', knowledge: '지식', idea: '아이디어', finance: '지출',
  relation: '관계', media: '미디어', care: '케어', development: '개발',
};

export function DataCardPanel({ itemId }: DataCardPanelProps) {
  const router = useRouter();
  const [node, setNode] = useState<DataNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/nodes/${itemId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setNode(data?.node ?? data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [itemId]);

  return (
    <div style={{
      position: 'fixed',
      right: 60,
      top: 56,
      width: 360,
      height: 'calc(100vh - 56px)',
      background: 'rgba(8,8,12,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slide-in-right 220ms ease-out',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {node ? (DOMAIN_LABELS[node.domain ?? ''] ?? node.domain ?? '데이터') : '로딩 중'}
        </span>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>로딩 중...</div>
        )}
        {!loading && !node && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>데이터를 찾을 수 없습니다.</div>
        )}
        {!loading && node && (
          <>
            {node.label && (
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 12 }}>
                {node.label}
              </div>
            )}
            {node.raw && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {node.raw}
              </div>
            )}
            {node.createdAt && (
              <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                {new Date(node.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
