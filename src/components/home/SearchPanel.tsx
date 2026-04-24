'use client';

import { CSSProperties, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export interface SearchResult {
  id: string;
  domain: string;
  domain_data?: Record<string, unknown>;
  raw: string;
  created_at: string;
  confidence?: string;
  similarity?: number;
}

interface Props {
  query: string;
  results: SearchResult[];
  loading: boolean;
  onClose: () => void;
}

const DOMAIN_META: Record<string, { icon: string; label: string; orb: string }> = {
  schedule:  { icon: '◫', label: '일정',   orb: 'calendar' },
  task:      { icon: '✓', label: '할 일',  orb: 'task' },
  finance:   { icon: '◈', label: '지출',   orb: 'finance' },
  habit:     { icon: '⟳', label: '습관',   orb: 'habit' },
  note:      { icon: '✎', label: '노트',   orb: 'note' },
  idea:      { icon: '✦', label: '아이디어', orb: 'idea' },
  knowledge: { icon: '◉', label: '지식',   orb: 'knowledge' },
  media:     { icon: '▶', label: '미디어', orb: 'youtube' },
  emotion:   { icon: '○', label: '감정',   orb: 'note' },
};

function getDisplayText(r: SearchResult): string {
  const dd = r.domain_data;
  if (dd) {
    const title = (dd.title ?? dd.what ?? dd.text ?? dd.name) as string | undefined;
    if (title) return title;
  }
  return r.raw.slice(0, 80);
}

function getSubText(r: SearchResult): string {
  const dd = r.domain_data;
  if (!dd) return '';
  if (r.domain === 'schedule') {
    const time = dd.time as string | undefined;
    const date = dd.date as string | undefined;
    return [time, date].filter(Boolean).join(' · ');
  }
  if (r.domain === 'finance') {
    const amount = dd.amount as number | undefined;
    if (amount) return `₩${amount.toLocaleString()}`;
  }
  return '';
}

export function SearchPanel({ query, results, loading, onClose }: Props) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  const panelStyle: CSSProperties = {
    position: 'fixed',
    top: 196,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 680,
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 480,
    background: 'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 16,
    boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
    zIndex: 500,
    display: 'flex',
    flexDirection: 'column',
    animation: 'ou-slide-down 160ms ease-out',
    overflow: 'hidden',
  };

  return (
    <div ref={panelRef} style={panelStyle}>
      {/* 헤더 */}
      <div style={{
        padding: '12px 16px 10px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--ou-text-dimmed)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {loading ? '검색 중...' : results.length > 0 ? `결과 ${results.length}개` : `"${query}" 결과 없음`}
      </div>

      {/* 결과 목록 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
            <span className="ou-spinner" style={{ width: 18, height: 18 }} />
          </div>
        )}

        {!loading && results.length === 0 && (
          <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--ou-text-muted)', textAlign: 'center' }}>
            일치하는 데이터가 없습니다.
          </div>
        )}

        {!loading && results.map((r, i) => {
          const meta = DOMAIN_META[r.domain] ?? { icon: '○', label: r.domain, orb: r.domain };
          const displayText = getDisplayText(r);
          const subText = getSubText(r);
          const date = new Date(r.created_at);
          const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;

          return (
            <button
              key={r.id}
              onClick={() => { router.push(`/orb/${meta.orb}`); onClose(); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 100ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.035)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {/* 도메인 배지 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                minWidth: 64,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{meta.icon}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--ou-text-dimmed)',
                  letterSpacing: '0.06em',
                }}>
                  {meta.label}
                </span>
              </div>

              {/* 텍스트 */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ou-text-strong)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {displayText}
                </div>
                {subText && (
                  <div style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', marginTop: 1 }}>
                    {subText}
                  </div>
                )}
              </div>

              {/* 날짜 */}
              <span style={{
                fontSize: 11,
                color: 'var(--ou-text-dimmed)',
                flexShrink: 0,
                fontFamily: 'var(--ou-font-mono)',
              }}>
                {dateStr}
              </span>
            </button>
          );
        })}
      </div>

      {/* 하단 CTA */}
      {!loading && results.length > 0 && (
        <button
          onClick={() => {
            router.push(`/orb/deep-talk?q=${encodeURIComponent(query)}`);
            onClose();
          }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--ou-text-muted)',
            textAlign: 'right',
            flexShrink: 0,
            transition: 'color 120ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ou-text-body)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ou-text-muted)')}
        >
          Deeptalk에서 더 보기 →
        </button>
      )}
    </div>
  );
}
