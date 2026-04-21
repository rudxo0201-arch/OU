import { Node, mergeAttributes } from '@tiptap/core';

/**
 * WikiLinkExtension — [[페이지 제목]] 인라인 노드
 * attrs: { pageId, title }
 *
 * 삽입 흐름:
 *   1. TiptapEditor가 [[ 타이핑 감지
 *   2. WikiLinkAutocomplete 드롭다운 표시
 *   3. 선택 시 이 노드 삽입 + /api/notes/links POST
 */
export const WikiLinkExtension = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      pageId: { default: null },
      title:  { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wiki-link]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-wiki-link': node.attrs.pageId,
        'data-title': node.attrs.title,
        style: [
          'display:inline-flex',
          'align-items:center',
          'gap:3px',
          'padding:1px 6px',
          'border-radius:4px',
          'background:var(--ou-surface-subtle)',
          'color:var(--ou-accent)',
          'font-size:0.92em',
          'cursor:pointer',
          'text-decoration:none',
          'font-weight:500',
        ].join(';'),
        onclick: `window.location.href='/note/${node.attrs.pageId}'`,
      }),
      `[[${node.attrs.title}]]`,
    ];
  },
});
