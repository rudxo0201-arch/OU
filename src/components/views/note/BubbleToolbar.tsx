'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { TextB, TextItalic, TextStrikethrough, Code, Link } from '@phosphor-icons/react';

type ToolbarPos = { x: number; y: number } | null;

type Props = {
  editor: Editor;
};

export function BubbleToolbar({ editor }: Props) {
  const [pos, setPos] = useState<ToolbarPos>(null);

  const updatePos = useCallback(() => {
    const { from, to, empty } = editor.state.selection;
    if (empty) { setPos(null); return; }

    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    const midX = (start.left + end.right) / 2;

    setPos({ x: midX, y: start.top - 8 });
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', updatePos);
    editor.on('blur', () => setPos(null));
    return () => {
      editor.off('selectionUpdate', updatePos);
      editor.off('blur', () => setPos(null));
    };
  }, [editor, updatePos]);

  if (!pos) return null;

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
        gap: 2,
        background: 'var(--ou-bg)',
        borderRadius: 'var(--ou-radius-sm)',
        boxShadow: 'var(--ou-neu-raised-sm)',
        padding: '3px 4px',
        pointerEvents: 'all',
      }}
    >
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
