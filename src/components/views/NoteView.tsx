'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { PencilSimple, Rows, SquaresFour } from '@phosphor-icons/react';
import type { Editor } from '@tiptap/react';
import type { ViewProps } from './registry';
import { useBlockPositionMap } from './note/useBlockPositionMap';
import type { Stroke } from './note/AnnotationLayer';
import type { LayoutPositions, TiptapNode } from './note/LayoutModeCanvas';
import './note/note.css';

const TiptapEditor   = dynamic(() => import('./note/TiptapEditor').then(m => m.TiptapEditor),         { ssr: false });
const BacklinkPanel  = dynamic(() => import('./note/BacklinkPanel').then(m => m.BacklinkPanel),       { ssr: false });
const AnnotationLayer = dynamic(() => import('./note/AnnotationLayer').then(m => m.AnnotationLayer),  { ssr: false });
const LayoutModeCanvas = dynamic(() => import('./note/LayoutModeCanvas').then(m => m.LayoutModeCanvas), { ssr: false });

type NoteMode = 'flow' | 'layout';

export function NoteView({ nodes, inline }: ViewProps) {
  const saveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const editorRef      = useRef<Editor | null>(null);

  const [mode, setMode]               = useState<NoteMode>('flow');
  const [annotating, setAnnotating]   = useState(false);
  const [strokes, setStrokes]         = useState<Stroke[]>([]);
  const [layoutPositions, setLayoutPositions] = useState<LayoutPositions>({});

  const { build: buildBlockMap, findBlockAt } = useBlockPositionMap(containerRef);

  const node       = nodes[0];
  const noteId     = node?.id as string | undefined;
  const domainData = (node?.domain_data ?? {}) as Record<string, unknown>;
  const initialContent = domainData.blocks as object | undefined;

  // 에디터 인스턴스 캡처
  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  // ── 자동저장 ──────────────────────────────────────────────────
  const handleUpdate = useCallback((json: object, text: string) => {
    if (!noteId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/nodes/${noteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw: text,
            domain_data: { ...domainData, blocks: json },
          }),
        });
      } catch { /* 낙관적 저장 */ }
    }, 800);
  }, [noteId, domainData]);

  // ── 어노테이션 저장 ───────────────────────────────────────────
  const handleStrokeAdd = useCallback((stroke: Stroke) => {
    const next = [...strokes, stroke];
    setStrokes(next);
    if (!noteId) return;
    stroke.relatedBlocks.forEach(({ nodeId: relatedNodeId }) => {
      if (!relatedNodeId) return;
      fetch('/api/notes/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: noteId, targetId: relatedNodeId }),
      }).catch(() => {});
    });
    fetch(`/api/nodes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_data: { ...domainData, annotations: next } }),
    }).catch(() => {});
  }, [strokes, noteId, domainData]);

  const handleStrokeRemove = useCallback((id: string) => {
    setStrokes((s) => s.filter((x) => x.id !== id));
  }, []);

  // ── 레이아웃 포지션 저장 ──────────────────────────────────────
  const handlePositionsChange = useCallback((positions: LayoutPositions) => {
    setLayoutPositions(positions);
    if (!noteId) return;
    fetch(`/api/nodes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_data: { ...domainData, layout_positions: positions } }),
    }).catch(() => {});
  }, [noteId, domainData]);

  // ── 레이아웃 모드 전환 시 초기 포지션 설정 ────────────────────
  const switchToLayout = useCallback(() => {
    setMode('layout');
    setAnnotating(false);
    // 저장된 positions가 없으면 초기화 (getPos fallback이 처리)
    const saved = domainData.layout_positions as LayoutPositions | undefined;
    setLayoutPositions(saved ?? {});
  }, [domainData]);

  // 레이아웃 모드에서 사용할 블록 (Tiptap JSON content 배열)
  const layoutBlocks: TiptapNode[] = (editorRef.current?.getJSON().content ?? []) as TiptapNode[];

  // ── 인라인 모드 ───────────────────────────────────────────────
  if (inline) {
    return (
      <div style={{ padding: '8px 12px' }}>
        {nodes.length === 0 ? (
          <p style={{ color: 'var(--ou-text-muted)', fontSize: 13 }}>노트 없음</p>
        ) : (
          nodes.map((n) => (
            <a
              key={n.id}
              href={`/note/${n.id}`}
              style={{
                display: 'block', padding: '6px 0', color: 'var(--ou-text-body)',
                textDecoration: 'none', fontSize: 14, borderBottom: '1px solid var(--ou-border-faint)',
              }}
            >
              {(n.domain_data as Record<string, unknown>)?.title as string || '제목 없음'}
            </a>
          ))
        )}
      </div>
    );
  }

  // ── 전체 편집 모드 ────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>
      {/* 모드 전환 툴바 */}
      <div
        style={{
          position: 'sticky',
          top: 48,
          zIndex: 20,
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '6px 24px',
          gap: 4,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 3,
            background: 'var(--ou-bg)',
            borderRadius: 'var(--ou-radius-pill)',
            boxShadow: 'var(--ou-neu-raised-sm)',
            padding: '3px 5px',
            pointerEvents: 'all',
          }}
        >
          <ModeBtn
            icon={<Rows size={13} />}
            label="문서"
            active={mode === 'flow' && !annotating}
            onClick={() => { setMode('flow'); setAnnotating(false); }}
          />
          <ModeBtn
            icon={<SquaresFour size={13} />}
            label="레이아웃"
            active={mode === 'layout'}
            onClick={switchToLayout}
          />
          <ModeBtn
            icon={<PencilSimple size={13} weight={annotating ? 'fill' : 'regular'} />}
            label="필기"
            active={annotating}
            onClick={() => { setAnnotating((v) => !v); setMode('flow'); }}
          />
        </div>
      </div>

      {/* ── Flow 모드 ── */}
      {mode === 'flow' && (
        <div ref={containerRef}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '8px 24px 32px' }}>
            <NoteTitleInput
              noteId={noteId}
              initialTitle={(domainData.title as string) ?? ''}
              domainData={domainData}
            />
            <div className="ou-note-editor" style={{ marginTop: 8 }}>
              <TiptapEditor
                noteId={noteId}
                initialContent={initialContent}
                onUpdate={handleUpdate}
                onEditorReady={handleEditorReady}
                readOnly={!noteId}
              />
            </div>
          </div>
          {noteId && <BacklinkPanel noteId={noteId} />}
        </div>
      )}

      {/* ── Layout 모드 ── */}
      {mode === 'layout' && (
        <div style={{ padding: '16px 24px' }}>
          <LayoutModeCanvas
            blocks={layoutBlocks}
            positions={layoutPositions}
            onPositionsChange={handlePositionsChange}
          />
        </div>
      )}

      {/* ── 어노테이션 오버레이 (항상 마운트, active로 제어) ── */}
      <AnnotationLayer
        active={annotating}
        strokes={strokes}
        onStrokeAdd={handleStrokeAdd}
        onStrokeRemove={handleStrokeRemove}
        findBlockAt={findBlockAt}
        buildBlockMap={buildBlockMap}
      />
    </div>
  );
}

// ── 제목 인풋 ──────────────────────────────────────────────────
function NoteTitleInput({
  noteId, initialTitle, domainData,
}: {
  noteId?: string;
  initialTitle: string;
  domainData: Record<string, unknown>;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <input
      defaultValue={initialTitle}
      onChange={(e) => {
        if (!noteId) return;
        const title = e.target.value;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          fetch(`/api/nodes/${noteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain_data: { ...domainData, title } }),
          }).catch(() => {});
        }, 600);
      }}
      placeholder="제목 없음"
      style={{
        display: 'block', width: '100%', border: 'none', background: 'transparent',
        fontSize: '2.2em', fontWeight: 700, color: 'var(--ou-text-heading)',
        fontFamily: 'var(--ou-font-body)', outline: 'none', padding: 0, lineHeight: 1.2,
      }}
    />
  );
}

// ── 모드 버튼 ──────────────────────────────────────────────────
function ModeBtn({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 8px', border: 'none', borderRadius: 'var(--ou-radius-pill)',
        background: active ? 'var(--ou-surface-muted)' : 'transparent',
        boxShadow: active ? 'var(--ou-neu-pressed-sm)' : 'none',
        cursor: 'pointer',
        fontSize: 11, fontWeight: active ? 600 : 400,
        color: active ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
        transition: 'all var(--ou-transition)',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
