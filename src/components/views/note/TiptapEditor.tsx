'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { OuViewBlockExtension } from './OuViewBlockExtension';
import { WikiLinkExtension } from './WikiLinkExtension';
import { BubbleToolbar } from './BubbleToolbar';
import { SlashCommandMenu, type SlashCommand } from './SlashCommandMenu';
import { WikiLinkAutocomplete } from './WikiLinkAutocomplete';
import {
  TextHOne, TextHTwo, TextHThree,
  ListBullets, ListNumbers, CheckSquare,
  Quotes, Code, Minus, TextT, Database,
} from '@phosphor-icons/react';

import type { Editor } from '@tiptap/react';

type Props = {
  noteId?: string;
  initialContent?: object;
  onUpdate: (json: object, text: string) => void;
  onEditorReady?: (editor: Editor) => void;
  readOnly?: boolean;
};

type SlashState  = { active: boolean; query: string; x: number; y: number };
type WikiState   = { active: boolean; query: string; x: number; y: number };
type DomainState = { active: boolean; x: number; y: number };

const DOMAIN_OPTIONS = [
  { key: 'task',      label: '할 일',    defaultView: 'task' },
  { key: 'schedule',  label: '일정',     defaultView: 'calendar' },
  { key: 'habit',     label: '습관',     defaultView: 'heatmap' },
  { key: 'finance',   label: '지출',     defaultView: 'chart' },
  { key: 'idea',      label: '아이디어', defaultView: 'idea' },
  { key: 'knowledge', label: '지식',     defaultView: 'table' },
];

export function TiptapEditor({ noteId, initialContent, onUpdate, onEditorReady, readOnly = false }: Props) {
  const [slash,  setSlash]  = useState<SlashState>({ active: false, query: '', x: 0, y: 0 });
  const [wiki,   setWiki]   = useState<WikiState>({ active: false, query: '', x: 0, y: 0 });
  const [domain, setDomain] = useState<DomainState>({ active: false, x: 0, y: 0 });

  const slashStartRef = useRef<number | null>(null);
  const wikiStartRef  = useRef<number | null>(null);

  // ── 슬래시 커맨드 목록 ──────────────────────────────────────────
  const buildCommands = useCallback((ed: ReturnType<typeof useEditor>): SlashCommand[] => {
    if (!ed) return [];
    return [
      { label: '텍스트',       description: '일반 문단',            icon: <TextT size={16} />,      action: () => ed.chain().focus().setParagraph().run() },
      { label: '제목 1',       description: '큰 제목',              icon: <TextHOne size={16} />,   action: () => ed.chain().focus().toggleHeading({ level: 1 }).run() },
      { label: '제목 2',       description: '중간 제목',            icon: <TextHTwo size={16} />,   action: () => ed.chain().focus().toggleHeading({ level: 2 }).run() },
      { label: '제목 3',       description: '작은 제목',            icon: <TextHThree size={16} />, action: () => ed.chain().focus().toggleHeading({ level: 3 }).run() },
      { label: '글머리 목록',  description: '• 항목 나열',          icon: <ListBullets size={16} />, action: () => ed.chain().focus().toggleBulletList().run() },
      { label: '번호 목록',    description: '1. 순서 있는 목록',    icon: <ListNumbers size={16} />, action: () => ed.chain().focus().toggleOrderedList().run() },
      { label: '할 일',        description: '체크박스 목록',         icon: <CheckSquare size={16} />, action: () => ed.chain().focus().toggleTaskList().run() },
      { label: '인용',         description: '블록 인용',             icon: <Quotes size={16} />,     action: () => ed.chain().focus().toggleBlockquote().run() },
      { label: '코드 블록',    description: '코드 입력',             icon: <Code size={16} />,       action: () => ed.chain().focus().toggleCodeBlock().run() },
      { label: '구분선',       description: '수평 줄',               icon: <Minus size={16} />,      action: () => ed.chain().focus().setHorizontalRule().run() },
      {
        label: 'OU 뷰',
        description: '데이터 뷰 임베드 (table, kanban…)',
        icon: <Database size={16} />,
        action: () => {
          const { from } = ed.state.selection;
          const coords = ed.view.coordsAtPos(from);
          setDomain({ active: true, x: coords.left, y: coords.bottom + 4 });
        },
      },
    ];
  }, []);

  // ── Tiptap 에디터 ──────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: ({ node }) => node.type.name === 'heading' ? '제목' : "'/\' 로 블록 추가, '[[' 로 페이지 링크…",
      }),
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      OuViewBlockExtension,
      WikiLinkExtension,
    ],
    content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editable: !readOnly,
    onCreate: ({ editor: ed }) => onEditorReady?.(ed),
    onUpdate: ({ editor: ed }) => onUpdate(ed.getJSON(), ed.getText()),
  });

  // ── 키 이벤트: 슬래시 + [[위키링크]] 감지 ──────────────────────
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 슬래시 커맨드
      if (e.key === '/' && !slash.active && !wiki.active) {
        const { from } = editor.state.selection;
        slashStartRef.current = from;
        const coords = editor.view.coordsAtPos(from);
        setSlash({ active: true, query: '', x: coords.left, y: coords.bottom + 4 });
      }
      if (slash.active && e.key === 'Backspace' && slash.query.length === 0) {
        setSlash((s) => ({ ...s, active: false }));
      }

      // 위키링크 [[ 감지
      if (e.key === '[' && !wiki.active && !slash.active) {
        // 직전 문자도 [ 인지 확인 (다음 keyup에서 체크)
        setTimeout(() => {
          if (!editor) return;
          const { from } = editor.state.selection;
          const prevTwo = editor.state.doc.textBetween(Math.max(0, from - 2), from, '');
          if (prevTwo === '[[') {
            wikiStartRef.current = from;
            const coords = editor.view.coordsAtPos(from);
            setWiki({ active: true, query: '', x: coords.left, y: coords.bottom + 4 });
          }
        }, 0);
      }
      if (wiki.active && e.key === 'Backspace' && wiki.query.length === 0) {
        setWiki((s) => ({ ...s, active: false }));
      }
    };

    const handleKeyUp = () => {
      // 슬래시 쿼리 업데이트
      if (slash.active && slashStartRef.current !== null) {
        const { from } = editor.state.selection;
        const text = editor.state.doc.textBetween(slashStartRef.current, from, '');
        setSlash((s) => ({ ...s, query: text }));
      }
      // 위키 쿼리 업데이트
      if (wiki.active && wikiStartRef.current !== null) {
        const { from } = editor.state.selection;
        const text = editor.state.doc.textBetween(wikiStartRef.current, from, '');
        setWiki((s) => ({ ...s, query: text }));
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener('keydown', handleKeyDown);
    dom.addEventListener('keyup', handleKeyUp);
    return () => {
      dom.removeEventListener('keydown', handleKeyDown);
      dom.removeEventListener('keyup', handleKeyUp);
    };
  }, [editor, slash.active, slash.query.length, wiki.active, wiki.query.length]);

  // ── 슬래시 커맨드 확정 (슬래시+쿼리 텍스트 삭제) ──────────────
  const confirmSlash = useCallback(() => {
    if (!editor || slashStartRef.current === null) return;
    const { from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: slashStartRef.current - 1, to: from }).run();
    slashStartRef.current = null;
    setSlash((s) => ({ ...s, active: false, query: '' }));
  }, [editor]);

  // ── WikiLink 확정: [[ + 쿼리 텍스트 삭제 → wikiLink 노드 삽입 ──
  const confirmWikiLink = useCallback(
    (pageId: string, title: string) => {
      if (!editor || wikiStartRef.current === null) return;
      const { from } = editor.state.selection;
      // [[ + query 삭제 (2 = '[[' 길이)
      editor
        .chain()
        .focus()
        .deleteRange({ from: wikiStartRef.current - 2, to: from })
        .insertContent({ type: 'wikiLink', attrs: { pageId, title } })
        .run();

      wikiStartRef.current = null;
      setWiki((s) => ({ ...s, active: false, query: '' }));

      // node_relations 생성
      if (noteId) {
        fetch('/api/notes/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: noteId, targetId: pageId }),
        }).catch(() => {});
      }
    },
    [editor, noteId]
  );

  // ── OU 뷰 블록 삽입 ────────────────────────────────────────────
  const insertOuViewBlock = useCallback(
    (domain_key: string, defaultView: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'ouViewBlock',
          attrs: { domain: domain_key, viewType: defaultView, activeViewType: defaultView, filterConfig: {}, layoutConfig: {} },
        })
        .run();
      setDomain((s) => ({ ...s, active: false }));
    },
    [editor]
  );

  const commands = editor ? buildCommands(editor) : [];

  return (
    <div style={{ position: 'relative' }}>
      {editor && <BubbleToolbar editor={editor} />}

      <EditorContent editor={editor} style={{ outline: 'none' }} />

      {/* 슬래시 커맨드 */}
      {slash.active && editor && (
        <SlashCommandMenu
          commands={commands.map((c) => ({ ...c, action: () => { confirmSlash(); c.action(); } }))}
          query={slash.query}
          onClose={() => setSlash((s) => ({ ...s, active: false }))}
          style={{ left: slash.x, top: slash.y }}
        />
      )}

      {/* 위키링크 자동완성 */}
      {wiki.active && (
        <WikiLinkAutocomplete
          query={wiki.query}
          style={{ left: wiki.x, top: wiki.y }}
          onSelect={confirmWikiLink}
          onClose={() => setWiki((s) => ({ ...s, active: false }))}
        />
      )}

      {/* 도메인 선택 (OU 뷰 삽입) */}
      {domain.active && (
        <div
          style={{
            position: 'fixed', left: domain.x, top: domain.y, zIndex: 1001,
            background: 'var(--ou-bg)', borderRadius: 'var(--ou-radius-md)',
            boxShadow: 'var(--ou-neu-raised-md)', padding: 4, minWidth: 180,
          }}
        >
          <div style={{ padding: '4px 8px', fontSize: 11, color: 'var(--ou-text-muted)', fontWeight: 500 }}>
            데이터 선택
          </div>
          {DOMAIN_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { confirmSlash(); insertOuViewBlock(opt.key, opt.defaultView); }}
              style={{ display: 'block', width: '100%', padding: '6px 10px', border: 'none', borderRadius: 'var(--ou-radius-sm)', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--ou-text-bright)' }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--ou-surface-muted)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setDomain((s) => ({ ...s, active: false }))}
            style={{ display: 'block', width: '100%', padding: '5px 10px', border: 'none', borderTop: '1px solid var(--ou-border-faint)', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 2 }}
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
