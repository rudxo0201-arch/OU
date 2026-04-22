'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState } from 'react';

// ── React NodeView ────────────────────────────────────────────────────────
function ImageBlockView({ node, updateAttributes, selected }: any) {
  const { src, caption, width } = node.attrs;
  const [inputMode, setInputMode] = useState(!src);
  const [urlInput, setUrlInput] = useState(src || '');

  const handleConfirm = () => {
    if (urlInput.trim()) {
      updateAttributes({ src: urlInput.trim() });
      setInputMode(false);
    }
  };

  return (
    <NodeViewWrapper>
      <div style={{
        margin: '10px 0',
        borderRadius: 10,
        overflow: 'hidden',
        border: selected ? '2px solid rgba(100,160,255,0.5)' : '2px solid transparent',
        transition: '200ms',
      }}>
        {inputMode || !src ? (
          /* URL 입력 */
          <div style={{
            display: 'flex', gap: 8, padding: '12px 14px',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: 10,
            border: '1px dashed rgba(0,0,0,0.10)',
          }}>
            <span style={{ fontSize: 16 }}>🖼️</span>
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') setInputMode(false); }}
              placeholder="이미지 URL 입력..."
              autoFocus
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: 'rgba(0,0,0,0.65)',
                fontFamily: 'var(--ou-font-body)',
              }}
            />
            <button onClick={handleConfirm}
              style={{
                padding: '4px 12px', borderRadius: 6,
                background: 'rgba(100,160,255,0.2)',
                border: '1px solid rgba(100,160,255,0.3)',
                color: 'rgba(180,210,255,0.9)',
                fontSize: 12, cursor: 'pointer',
              }}>
              삽입
            </button>
          </div>
        ) : (
          /* 이미지 표시 */
          <div>
            <div style={{ position: 'relative' }}
              onMouseEnter={e => (e.currentTarget.querySelector('.img-overlay') as HTMLElement | null)?.style && ((e.currentTarget.querySelector('.img-overlay') as HTMLElement).style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.querySelector('.img-overlay') as HTMLElement | null)?.style && ((e.currentTarget.querySelector('.img-overlay') as HTMLElement).style.opacity = '0')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={caption || ''}
                style={{
                  width: width || '100%',
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                  borderRadius: 8,
                }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; setInputMode(true); }}
              />
              {/* 오버레이 버튼 */}
              <div className="img-overlay" style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8,
                opacity: 0, transition: '150ms',
              }}>
                <button
                  contentEditable={false}
                  onClick={() => setInputMode(true)}
                  style={{
                    padding: '6px 12px', borderRadius: 6,
                    background: 'rgba(0,0,0,0.10)',
                    border: '1px solid rgba(0,0,0,0.12)',
                    color: '#fff', fontSize: 12, cursor: 'pointer',
                  }}>
                  URL 변경
                </button>
              </div>
            </div>
            {/* 캡션 */}
            <input
              value={caption || ''}
              onChange={e => updateAttributes({ caption: e.target.value })}
              placeholder="캡션 추가..."
              style={{
                display: 'block', width: '100%',
                background: 'none', border: 'none', outline: 'none',
                fontSize: 12, color: 'rgba(0,0,0,0.30)',
                textAlign: 'center', padding: '6px 0',
                fontFamily: 'var(--ou-font-body)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ── Tiptap Extension ──────────────────────────────────────────────────────
export const ImageBlockExtension = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src:     { default: '' },
      caption: { default: '' },
      width:   { default: '100%' },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="imageBlock"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes({ 'data-type': 'imageBlock' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});
