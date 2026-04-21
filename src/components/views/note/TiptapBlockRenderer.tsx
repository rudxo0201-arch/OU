'use client';

/**
 * TiptapBlockRenderer
 * Tiptap JSON 블록 하나를 React 엘리먼트로 렌더링.
 * Layout 모드에서 각 블록을 절대좌표 컨테이너 안에 표시할 때 사용.
 */

import dynamic from 'next/dynamic';

const OuViewBlock = dynamic(
  () => import('./OuViewBlock').then((m) => m.OuViewBlock),
  { ssr: false }
);

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

// 인라인 노드 → 텍스트 추출 (marks 적용)
function renderInline(nodes: TiptapNode[]): React.ReactNode {
  return nodes.map((node, i) => {
    if (node.type === 'text') {
      let el: React.ReactNode = node.text ?? '';
      (node.marks ?? []).forEach((mark) => {
        if (mark.type === 'bold')   el = <strong key={i}>{el}</strong>;
        if (mark.type === 'italic') el = <em key={i}>{el}</em>;
        if (mark.type === 'strike') el = <s key={i}>{el}</s>;
        if (mark.type === 'code')   el = <code key={i}>{el}</code>;
        if (mark.type === 'link')   el = <a key={i} href={mark.attrs?.href as string} style={{ color: 'var(--ou-accent)' }}>{el}</a>;
      });
      return <span key={i}>{el}</span>;
    }
    if (node.type === 'hardBreak') return <br key={i} />;
    if (node.type === 'wikiLink') {
      return (
        <a
          key={i}
          href={`/note/${node.attrs?.pageId}`}
          style={{ color: 'var(--ou-accent)', padding: '1px 5px', background: 'var(--ou-surface-subtle)', borderRadius: 4, textDecoration: 'none', fontSize: '0.92em' }}
        >
          [[{node.attrs?.title as string}]]
        </a>
      );
    }
    return null;
  });
}

export function TiptapBlockRenderer({ node }: { node: TiptapNode }) {
  const content = node.content ?? [];
  const inlineText = content.length > 0 && content[0].type === 'text'
    ? renderInline(content)
    : null;

  switch (node.type) {
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
      const sizes = { 1: '1.8em', 2: '1.3em', 3: '1.1em' };
      return (
        <Tag style={{ margin: 0, fontSize: sizes[level as 1|2|3] ?? '1.1em', fontWeight: 700, color: 'var(--ou-text-heading)', lineHeight: 1.2 }}>
          {renderInline(content)}
        </Tag>
      );
    }

    case 'paragraph':
      return (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ou-text-body)', lineHeight: 1.6 }}>
          {content.length ? renderInline(content) : <span style={{ color: 'var(--ou-text-faint)' }}>빈 문단</span>}
        </p>
      );

    case 'bulletList':
      return (
        <ul style={{ margin: 0, paddingLeft: '1.4em', fontSize: 14, color: 'var(--ou-text-body)' }}>
          {content.map((item, i) => (
            <li key={i}>{item.content ? renderInline(item.content.flatMap((c) => c.content ?? [])) : null}</li>
          ))}
        </ul>
      );

    case 'orderedList':
      return (
        <ol style={{ margin: 0, paddingLeft: '1.4em', fontSize: 14, color: 'var(--ou-text-body)' }}>
          {content.map((item, i) => (
            <li key={i}>{item.content ? renderInline(item.content.flatMap((c) => c.content ?? [])) : null}</li>
          ))}
        </ol>
      );

    case 'taskList':
      return (
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: 14 }}>
          {content.map((item, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <input type="checkbox" defaultChecked={item.attrs?.checked as boolean} style={{ marginTop: 3, accentColor: 'var(--ou-accent)' }} />
              <span style={{ color: item.attrs?.checked ? 'var(--ou-text-muted)' : 'var(--ou-text-body)', textDecoration: item.attrs?.checked ? 'line-through' : 'none' }}>
                {item.content ? renderInline(item.content.flatMap((c) => c.content ?? [])) : null}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'blockquote':
      return (
        <blockquote style={{ margin: 0, borderLeft: '3px solid var(--ou-text-disabled)', paddingLeft: 12, color: 'var(--ou-text-secondary)', fontStyle: 'italic', fontSize: 14 }}>
          {content.map((child, i) => <TiptapBlockRenderer key={i} node={child} />)}
        </blockquote>
      );

    case 'codeBlock':
      return (
        <pre style={{ margin: 0, background: 'var(--ou-bg-alt)', borderRadius: 6, padding: '10px 12px', fontSize: 12, fontFamily: 'var(--ou-font-mono)', overflowX: 'auto', boxShadow: 'var(--ou-neu-pressed-sm)' }}>
          <code>{content.map((c) => c.text).join('')}</code>
        </pre>
      );

    case 'horizontalRule':
      return <hr style={{ border: 'none', borderTop: '1px solid var(--ou-border-subtle)', margin: '4px 0' }} />;

    case 'ouViewBlock':
      // OuViewBlock NodeView props를 최소한으로 시뮬레이션
      return (
        <div style={{ opacity: 0.8, pointerEvents: 'none' }}>
          <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--ou-text-muted)', background: 'var(--ou-bg-alt)', borderRadius: 6 }}>
            📊 {node.attrs?.domain as string} / {node.attrs?.activeViewType as string || node.attrs?.viewType as string}
          </div>
        </div>
      );

    default:
      return (
        <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', padding: '2px 4px' }}>
          [{node.type}]
        </div>
      );
  }
}
