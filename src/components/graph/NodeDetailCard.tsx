'use client';

import { X } from 'lucide-react';

interface RawNode {
  id: string;
  domain?: string;
  label?: string;
  raw?: string;
  createdAt?: string;
  domainType?: string | null;
  isAdmin?: boolean;
  [key: string]: unknown;
}

interface Props {
  node: RawNode;
  onClose: () => void;
  onOpenPage?: () => void;
}

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', task: '할일', habit: '습관', journal: '일기',
  note: '노트', knowledge: '지식', idea: '아이디어', finance: '지출',
  relation: '관계', media: '미디어', care: '케어', health: '건강',
  study: '학습', development: '개발',
};

export function NodeDetailCard({ node, onClose, onOpenPage }: Props) {
  const domain = node.domain ?? 'unknown';
  const domainLabel = DOMAIN_LABELS[domain] ?? domain;
  const rawText = node.raw ?? node.label ?? '';
  const date = node.createdAt
    ? new Date(node.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      right: 16,
      transform: 'translateY(-50%)',
      zIndex: 50,
      width: 240,
      background: 'rgba(12,12,18,0.88)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 16,
      padding: '20px 16px 16px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      animation: 'node-card-in 0.26s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <style>{`
        @keyframes node-card-in {
          from { opacity: 0; transform: translateY(-50%) translateX(16px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>

      {/* 닫기 */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 10, right: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.28)', padding: 4, borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 120ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}
      >
        <X size={13} />
      </button>

      {/* 도메인 뱃지 */}
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 8px', borderRadius: 999, marginBottom: 12,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(255,255,255,0.06)',
        fontSize: 10, fontWeight: 600,
        color: 'rgba(255,255,255,0.45)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        {domainLabel}
      </div>

      {/* 본문 */}
      <p style={{
        fontSize: 13,
        lineHeight: 1.6,
        color: 'rgba(255,255,255,0.82)',
        marginBottom: 14,
        wordBreak: 'break-word',
        display: '-webkit-box',
        WebkitLineClamp: 6,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {rawText || '(내용 없음)'}
      </p>

      {/* 날짜 + 자세히 보기 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        {date && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{date}</div>
        )}
        {onOpenPage && (
          <button
            onClick={onOpenPage}
            style={{
              marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 6, padding: '3px 8px', fontSize: 11,
              color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            자세히 →
          </button>
        )}
      </div>
    </div>
  );
}
