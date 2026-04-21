import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { OuViewBlock } from './OuViewBlock';

export interface OuViewBlockAttrs {
  domain: string;
  viewType: string;
  activeViewType: string;
  filterConfig: Record<string, unknown>;
  layoutConfig: Record<string, unknown>;
}

/**
 * OuViewBlockExtension — 에디터 내 OU 뷰 임베드 블록
 * 슬래시 커맨드 '/database' 또는 '/뷰' 로 삽입
 */
export const OuViewBlockExtension = Node.create({
  name: 'ouViewBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      domain:          { default: 'task' },
      viewType:        { default: 'table' },
      activeViewType:  { default: '' },
      filterConfig:    { default: {} },
      layoutConfig:    { default: {} },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="ou-view-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'ou-view-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(OuViewBlock);
  },
});
