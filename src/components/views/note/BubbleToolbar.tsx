'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { TextB, TextItalic, TextStrikethrough, Code, Link, TextHOne, TextHTwo, TextHThree, TextT, ArrowsOut } from '@phosphor-icons/react';

type ToolbarPos = { x: number; y: number } | null;

type Props = {
  editor: Editor;
};

export function BubbleToolbar({ editor }: Props) {
  const [pos, setPos]               = useState<ToolbarPos>(null);
  const [turnIntoOpen, setTurnIntoOpen] = useState(false);

  const updatePos = useCallback(() => {
    const { from, to, empty } = editor.state.selection;
    if (empty) { setPos(null); setTurnIntoOpen(false); return; }

    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    const midX = (start.left + end.right) / 2;

    setPos({ x: midX, y: start.top - 8 });
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', updatePos);
    editor.on('blur', () => { setPos(null); setTurnIntoOpen(false); });
    return () => {
      editor.off('selectionUpdate', updatePos);
      editor.off('blur', () => setPos(null));
    };
  }, [editor, updatePos]);

  if (!pos) return null;

  const TURN_INTO = [
    { label: '텍스트',  icon: <TextT size={13} />,       action: () => editor.chain().focus().setParagraph().run(),               isActive: editor.isActive('paragraph') },
    { label: '제목 1',  icon: <TextHOne size={13} />,    action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
    { label: '제목 2',  icon: <TextHTwo size={13} />,    action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
    { label: '제목 3',  icon: <TextHThree size={13} />,  action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive('heading', { level: 3 }) },
  ];

  const buttons = [
    {
      icon: <TextB size={13} weight="bold" />,
      title: 'Bold',
      isActive: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: <TextItalic size={13} />,
      title: 'Italic',
      isActive: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      icon: <TextStrikethrough size={13} />,
      title: 'Strike',
      isActive: editor.isActive('strike'),
      onClick: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      icon: <Code size={13} />,
      title: 'Code',
      isActive: editor.isActive('code'),
      onClick: () => editor.chain().focus().toggleCode().run(),
    },
    {
      icon: <Link size={13} />,
      title: 'Link',
      isActive: editor.isActive('link'),
      onClick: () => {
        const url = window.prompt('URL');
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        } else {
          editor.chain().focus().unsetLink().run();
        }
      },
    },
  ];

  const activeBlockLabel =
    editor.isActive('heading', { level: 1 }) ? 'H1' :
    editor.isActive('heading', { level: 2 }) ? 'H2' :
    editor.isActive('heading', { level: 3 }) ? 'H3' : 'T';

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -100%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: 'var(--ou-bg)',
        borderRadius: 'var(--ou-radius-sm)',
        boxShadow: 'var(--ou-neu-raised-sm)',
        padding: '3px 4px',
        pointerEvents: 'all',
      }}
    >
      {/* Turn into 드롭다운 */}
      <div style={{ position: 'relative' }}>
        <button
          title="블록 변환"
          onMouseDown={(e) => { e.preventDefault(); setTurnIntoOpen((v) => !v); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 3,
            height: 28, padding: '0 8px',
            border: 'none', borderRadius: 'var(--ou-radius-sm)',
            background: turnIntoOpen ? 'var(--ou-surface-muted)' : 'transparent',
            cursor: 'pointer',
            color: 'var(--ou-text-secondary)',
            fontSize: 11, fontWeight: 600,
            transition: 'all var(--ou-transition)',
          }}
        >
          {activeBlockLabel}
          <ArrowsOut size={10} />
        </button>

        {turnIntoOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--ou-bg)', borderRadius: 'var(--ou-radius-sm)',
            boxShadow: 'var(--ou-neu-raised-md)', padding: 4, minWidth: 130, zIndex: 1001,
          }}>
            {TURN_INTO.map((opt) => (
              <button
                key={opt.label}
                onMouseDown={(e) => { e.preventDefault(); opt.action(); setTurnIntoOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 10px',
                  border: 'none', borderRadius: 'var(--ou-radius-sm)',
                  background: opt.isActive ? 'var(--ou-surface-muted)' : 'transparent',
                  cursor: 'pointer',
                  color: opt.isActive ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
                  fontSize: 12, textAlign: 'left',
                  transition: 'background 100ms',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ou-surface-muted)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = opt.isActive ? 'var(--ou-surface-muted)' : 'transparent'; }}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div style={{ width: 1, height: 18, background: 'var(--ou-border-subtle)', margin: '0 4px', flexShrink: 0 }} />

      {buttons.map((btn) => (
        <button
          key={btn.title}
          title={btn.title}
          onMouseDown={(e) => { e.preventDefault(); btn.onClick(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            border: 'none',
            borderRadius: 'var(--ou-radius-sm)',
            background: btn.isActive ? 'var(--ou-surface-muted)' : 'transparent',
            boxShadow: btn.isActive ? 'var(--ou-neu-pressed-sm)' : 'none',
            cursor: 'pointer',
            color: btn.isActive ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
            transition: 'all var(--ou-transition)',
          }}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
