'use client';

import { ViewRenderer } from '@/components/views/ViewRenderer';
import { DOMAIN_VIEW_MAP } from '@/components/views/registry';

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '가계부', task: '할 일',
  emotion: '감정', idea: '아이디어', habit: '습관',
  knowledge: '지식', relation: '인물',
};

interface NodeViewClientProps {
  node: any;
  triples: Array<{ subject: string; predicate: string; object: string }>;
  sections: Array<{ id: string; heading: string; order_idx: number }>;
  sentences: Array<{ id: string; section_id: string; text: string; order_idx: number }>;
  viewTypeOverride?: string;
}

export function NodeViewClient({ node, triples, sections, sentences, viewTypeOverride }: NodeViewClientProps) {
  const viewType = viewTypeOverride || node.view_hint || DOMAIN_VIEW_MAP[node.domain];
  const date = node.created_at
    ? new Date(node.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  /* ── Section title style ── */
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: 'var(--ou-text-dimmed)',
    fontWeight: 500,
  };

  /* ── Card style ── */
  const cardStyle: React.CSSProperties = {
    background: 'transparent',
    border: '0.5px solid var(--ou-border-subtle)',
    borderRadius: 'var(--ou-radius-card)',
    boxShadow: 'var(--ou-glow-sm)',
    padding: 16,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24 }}>
      {/* 데이터뷰 렌더링 (매칭되는 뷰가 있으면) */}
      {viewType && (
        <ViewRenderer viewType={viewType} nodes={[node]} />
      )}

      {/* 원문 */}
      {node.raw && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={sectionTitleStyle}>원문</span>
            <span style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--ou-text-body)' }}>
              {node.raw}
            </span>
          </div>
        </div>
      )}

      {/* 구조화된 문장 */}
      {sections.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={sectionTitleStyle}>구조</span>
            {sections.map(sec => {
              const sectionSentences = sentences
                .filter(s => s.section_id === sec.id)
                .sort((a, b) => a.order_idx - b.order_idx);
              return (
                <div key={sec.id}>
                  {sec.heading && (
                    <span style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--ou-text-strong)', display: 'block' }}>
                      {sec.heading}
                    </span>
                  )}
                  {sectionSentences.map(s => (
                    <span key={s.id} style={{ fontSize: 14, paddingLeft: 12, color: 'var(--ou-text-body)', display: 'block' }}>
                      {s.text}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 트리플 (관계) */}
      {triples.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={sectionTitleStyle}>관계</span>
            {triples.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    background: 'var(--ou-surface-muted)',
                    border: '0.5px solid var(--ou-border-subtle)',
                    borderRadius: 'var(--ou-radius-pill)',
                    color: 'var(--ou-text-body)',
                  }}
                >
                  {t.subject}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>{t.predicate}</span>
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    background: 'var(--ou-surface-muted)',
                    border: '0.5px solid var(--ou-border-subtle)',
                    borderRadius: 'var(--ou-radius-pill)',
                    color: 'var(--ou-text-body)',
                  }}
                >
                  {t.object}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 메타 정보 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {date && <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>{date}</span>}
        {node.confidence && (
          <>
            <div style={{ width: '0.5px', height: 12, background: 'var(--ou-border-subtle)' }} />
            <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>{node.confidence}</span>
          </>
        )}
        {node.domain && (
          <>
            <div style={{ width: '0.5px', height: 12, background: 'var(--ou-border-subtle)' }} />
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                background: 'var(--ou-surface-muted)',
                border: '0.5px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-pill)',
                color: 'var(--ou-text-dimmed)',
              }}
            >
              {DOMAIN_LABELS[node.domain] || node.domain}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
