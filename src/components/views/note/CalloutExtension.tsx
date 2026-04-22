'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useState } from 'react';

// ── Callout 타입별 스타일 ─────────────────────────────────────────────────
export type CalloutType = 'info' | 'tip' | 'warning' | 'error' | 'note';

export const CALLOUT_PRESETS: Record<CalloutType, { emoji: string; bg: string; border: string; label: string }> = {
  info:    { emoji: '💡', bg: 'rgba(100,160,255,0.08)', border: 'rgba(100,160,255,0.25)', label: '정보' },
  tip:     { emoji: '✅', bg: 'rgba(80,200,120,0.08)',  border: 'rgba(80,200,120,0.25)',  label: '팁' },
  warning: { emoji: '⚠️', bg: 'rgba(255,190,80,0.08)', border: 'rgba(255,190,80,0.25)',  label: '주의' },
  error:   { emoji: '🚫', bg: 'rgba(255,100,100,0.08)', border: 'rgba(255,100,100,0.25)', label: '오류' },
  note:    { emoji: '📝', bg: 'rgba(0,0,0,0.04)', border: 'rgba(0,0,0,0.10)', label: '메모' },
};

// ── React NodeView ────────────────────────────────────────────────────────
function CalloutNodeView({ node, updateAttributes }: any) {
  const type: CalloutType = node.attrs.type ?? 'info';
  const emoji: string = node.attrs.emoji ?? CALLOUT_PRESETS[type].emoji;
  const preset = CALLOUT_PRESETS[type];
  const [showTypePicker, setShowTypePicker] = useState(false);

  return (
    <NodeViewWrapper>
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 10,
          background: preset.bg,
          border: `1px solid ${preset.border}`,
          margin: '6px 0',
          position: 'relative',
        }}
      >
        {/* 이모지 버튼 */}
        <div style={{ position: 'relative' }}>
          <button
            contentEditable={false}
            onClick={() => setShowTypePicker((v) => !v)}
            style={{
              fontSize: 18, cursor: 'pointer',
              background: 'none', border: 'none',
              padding: '2px 4px', borderRadius: 4,
              lineHeight: 1, flexShrink: 0, marginTop: 2,
              transition: '150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            title="타입 변경"
          >
            {emoji}
          </button>

          {/* 타입 피커 */}
          {showTypePicker && (
            <div
              contentEditable={false}
              style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 100,
                background: 'rgba(20,20,30,0.95)',
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 10, padding: 6,
                display: 'flex', flexDirection: 'column', gap: 2,
                minWidth: 120,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              {(Object.entries(CALLOUT_PRESETS) as [CalloutType, typeof CALLOUT_PRESETS[CalloutType]][]).map(([key, p]) => (
                <button key={key}
                  onClick={() => { updateAttributes({ type: key, emoji: p.emoji }); setShowTypePicker(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', border: 'none', borderRadius: 6,
                    background: type === key ? 'rgba(0,0,0,0.08)' : 'transparent',
                    cursor: 'pointer', fontSize: 12, color: 'rgba(0,0,0,0.72)',
                  }}
                >
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 콘텐츠 */}
        <NodeViewContent
          style={{
            flex: 1, minWidth: 0,
            fontSize: 14, lineHeight: 1.65,
            color: 'rgba(0,0,0,0.80)',
          }}
        />
      </div>
    </NodeViewWrapper>
  );
}

// ── Tiptap Extension ──────────────────────────────────────────────────────
export const CalloutExtension = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type:  { default: 'info' },
      emoji: { default: '💡' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'callout' }, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },
});
