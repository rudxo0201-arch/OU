'use client';

import { useCallback, useEffect, useRef, useState, forwardRef } from 'react';
import dynamic from 'next/dynamic';
import { PencilSimple, Rows, SquaresFour, Image, Smiley, X, Eye, EyeSlash } from '@phosphor-icons/react';
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
  const node       = nodes[0];
  const noteId     = node?.id as string | undefined;
  const domainData = (node?.domain_data ?? {}) as Record<string, unknown>;
  const initialContent = domainData.blocks as object | undefined;

  const saveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const editorRef      = useRef<Editor | null>(null);
  const titleInputRef  = useRef<HTMLInputElement>(null);

  const [mode, setMode]               = useState<NoteMode>('flow');
  const [annotating, setAnnotating]   = useState(false);
  const [showStrokes, setShowStrokes] = useState(true);
  const [strokes, setStrokes]         = useState<Stroke[]>(
    (domainData.annotations as Stroke[] | undefined) ?? []
  );
  const [layoutPositions, setLayoutPositions] = useState<LayoutPositions>({});

  const { build: buildBlockMap, findBlockAt } = useBlockPositionMap(containerRef);

  // ── 최신 domain_data를 항상 참조하는 ref ─────────────────────
  // 클로저 stale 문제 방지: 저장 시 항상 이 ref를 사용
  const domainDataRef = useRef<Record<string, unknown>>({ ...domainData });
  useEffect(() => {
    domainDataRef.current = { ...domainData };
  }, [domainData]);

  // 특정 필드를 패치하고 ref를 최신화하는 공통 save 함수
  const patchNode = useCallback((patch: Record<string, unknown>, extra?: { raw?: string }) => {
    if (!noteId) return;
    domainDataRef.current = { ...domainDataRef.current, ...patch };
    fetch(`/api/nodes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_data: domainDataRef.current, ...extra }),
    }).catch(() => {});
  }, [noteId]);

  // 에디터 인스턴스 캡처
  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  // ── 자동저장 ──────────────────────────────────────────────────
  const handleUpdate = useCallback((json: object, text: string) => {
    if (!noteId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      patchNode({ blocks: json }, { raw: text });
    }, 800);
  }, [noteId, patchNode]);

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
    patchNode({ annotations: next });
  }, [strokes, noteId, patchNode]);

  const handleStrokeRemove = useCallback((id: string) => {
    setStrokes((s) => s.filter((x) => x.id !== id));
  }, []);

  // ── 레이아웃 포지션 저장 ──────────────────────────────────────
  const handlePositionsChange = useCallback((positions: LayoutPositions) => {
    setLayoutPositions(positions);
    patchNode({ layout_positions: positions });
  }, [patchNode]);

  // ── 레이아웃 모드 전환 시 초기 포지션 설정 ────────────────────
  const switchToLayout = useCallback(() => {
    setMode('layout');
    setAnnotating(false);
    const saved = domainDataRef.current.layout_positions as LayoutPositions | undefined;
    setLayoutPositions(saved ?? {});
  }, []);

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

  // ── 노트 없음: 첫 노트 생성 유도 ─────────────────────────────
  if (nodes.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', gap: 16,
        color: 'var(--ou-text-muted)',
      }}>
        <span style={{ fontSize: 48, opacity: 0.2 }}>✎</span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: 'var(--ou-text-secondary)', marginBottom: 6 }}>
            노트가 없습니다
          </div>
          <div style={{ fontSize: 13, color: 'var(--ou-text-disabled)' }}>
            새 노트를 만들어 보세요
          </div>
        </div>
        <a
          href="/note/new"
          style={{
            marginTop: 8,
            padding: '10px 24px',
            background: 'var(--ou-accent)',
            color: '#fff',
            borderRadius: 'var(--ou-radius-sm)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'opacity 150ms',
          }}
        >
          새 노트 만들기
        </a>
      </div>
    );
  }

  // ── 전체 편집 모드 ────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>
      {/* 모드 전환 툴바 — z:60 으로 필기 캔버스(z:50) 위에 항상 표시 */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
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
            gap: 2,
            background: 'var(--ou-glass-elevated)',
            backdropFilter: 'var(--ou-blur)',
            WebkitBackdropFilter: 'var(--ou-blur)',
            border: '1px solid var(--ou-glass-border)',
            borderRadius: 'var(--ou-radius-pill)',
            boxShadow: 'var(--ou-shadow-sm)',
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
            onClick={() => { setAnnotating((v) => !v); }}
          />
          {/* 필기 보기/숨기기 — 필기가 있을 때만 표시 */}
          {strokes.length > 0 && !annotating && (
            <ModeBtn
              icon={showStrokes ? <Eye size={13} /> : <EyeSlash size={13} />}
              label={showStrokes ? '필기 숨기기' : '필기 보기'}
              active={false}
              onClick={() => setShowStrokes((v) => !v)}
            />
          )}
        </div>
      </div>

      {/* ── 문서 본문 — flow/layout/annotating 모두 항상 렌더 ── */}
      <div ref={containerRef}>
        <NotePageHeader
          initialCover={(domainData.cover as string) ?? ''}
          initialIcon={(domainData.icon as string) ?? ''}
          onSave={patchNode}
        />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 32px', position: 'relative' }}>
          <NoteTitleInput
            ref={titleInputRef}
            initialTitle={(domainData.title as string) ?? ''}
            onSave={(title) => patchNode({ title })}
            onEnter={() => editorRef.current?.commands.focus('start')}
          />
          <div className="ou-note-editor" style={{ marginTop: 8 }}>
            {/* 레이아웃/필기 모드에서는 readOnly — 내용 수정 방지 */}
            <TiptapEditor
              noteId={noteId}
              initialContent={initialContent}
              onUpdate={handleUpdate}
              onEditorReady={handleEditorReady}
              onFocusTitle={() => {
                const el = titleInputRef.current;
                if (!el) return;
                el.focus();
                // 제목 텍스트 끝으로 커서 이동
                const len = el.value.length;
                el.setSelectionRange(len, len);
              }}
              readOnly={!noteId || mode === 'layout' || annotating}
            />
          </div>

          {/* 레이아웃 모드 오버레이 — 문서와 동일한 위치에 드래그 핸들 */}
          {mode === 'layout' && (
            <LayoutModeCanvas
              blocks={layoutBlocks}
              positions={layoutPositions}
              onPositionsChange={handlePositionsChange}
            />
          )}
        </div>
        {noteId && <BacklinkPanel noteId={noteId} />}
      </div>

      {/* ── 어노테이션 오버레이 (항상 마운트, active로 제어) ── */}
      <AnnotationLayer
        active={annotating}
        visible={annotating || showStrokes}
        strokes={strokes}
        onStrokeAdd={handleStrokeAdd}
        onStrokeRemove={handleStrokeRemove}
        findBlockAt={findBlockAt}
        buildBlockMap={buildBlockMap}
      />
    </div>
  );
}

// ── Notion 스타일 페이지 헤더 (커버 + 아이콘) ──────────────────
const EMOJI_PRESETS = ['📝','📖','💡','🎯','🚀','🌟','💎','🔥','⚡','🌈','🎨','🎵','📊','🗺️','🧠','✨','📌','🔑','💼','🌿'];

function NotePageHeader({
  initialCover, initialIcon, onSave,
}: {
  initialCover: string;
  initialIcon: string;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [cover, setCover] = useState<string>(initialCover);
  const [icon, setIcon]   = useState<string>(initialIcon);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverInput, setShowCoverInput]   = useState(false);
  const [coverInput, setCoverInput]           = useState('');
  const [hoverHeader, setHoverHeader]         = useState(false);

  const save = onSave;

  return (
    <div>
      {/* 커버 영역 */}
      {cover ? (
        <div
          style={{ position: 'relative', height: 200, overflow: 'hidden', marginBottom: icon ? 44 : 16 }}
          onMouseEnter={() => setHoverHeader(true)}
          onMouseLeave={() => setHoverHeader(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {hoverHeader && (
            <div style={{ position: 'absolute', bottom: 8, right: 12, display: 'flex', gap: 6 }}>
              <button
                onClick={() => { setShowCoverInput(true); setHoverHeader(false); }}
                style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,0,0,0.12)', color: '#fff', cursor: 'pointer' }}
              >
                커버 변경
              </button>
              <button
                onClick={() => { setCover(''); save({ cover: '' }); }}
                style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,0,0,0.12)', color: '#fff', cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            </div>
          )}
          {/* 아이콘 (커버 있을 때 하단에 위치) */}
          {icon && (
            <button
              onClick={() => setShowEmojiPicker((v) => !v)}
              style={{ position: 'absolute', bottom: -36, left: 'calc((100% - 720px) / 2 + 24px)', fontSize: 52, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {icon}
            </button>
          )}
        </div>
      ) : (
        /* 커버 없을 때 아이콘만 */
        icon && (
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 0', position: 'relative' }}>
            <button
              onClick={() => setShowEmojiPicker((v) => !v)}
              style={{ fontSize: 52, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {icon}
            </button>
          </div>
        )
      )}

      {/* 아이콘/커버 추가 버튼 (커버+아이콘 없을 때 hover로 표시) */}
      {!cover && !icon && (
        <div
          style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 0', display: 'flex', gap: 8, opacity: 0, transition: '150ms' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
        >
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, borderRadius: 6, background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)', color: 'var(--ou-text-muted)', cursor: 'pointer' }}
          >
            <Smiley size={14} /> 아이콘 추가
          </button>
          <button
            onClick={() => setShowCoverInput(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, borderRadius: 6, background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)', color: 'var(--ou-text-muted)', cursor: 'pointer' }}
          >
            <Image size={14} /> 커버 추가
          </button>
        </div>
      )}

      {/* 이모지 피커 */}
      {showEmojiPicker && (
        <div
          style={{
            position: 'fixed', zIndex: 200,
            top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'var(--ou-bg)', border: '1px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-md)', padding: 16,
            boxShadow: 'var(--ou-shadow-lg)', minWidth: 280,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>아이콘 선택</span>
            {icon && (
              <button onClick={() => { setIcon(''); save({ icon: '' }); setShowEmojiPicker(false); }}
                style={{ fontSize: 11, color: 'var(--ou-text-disabled)', background: 'none', border: 'none', cursor: 'pointer' }}>
                제거
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {EMOJI_PRESETS.map((e) => (
              <button key={e} onClick={() => { setIcon(e); save({ icon: e }); setShowEmojiPicker(false); }}
                style={{ fontSize: 24, padding: 6, borderRadius: 6, background: icon === e ? 'rgba(0,0,0,0.07)' : 'none', border: 'none', cursor: 'pointer', transition: '100ms' }}
                onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.background = icon === e ? 'rgba(0,0,0,0.07)' : 'none'; }}
              >
                {e}
              </button>
            ))}
          </div>
          <button onClick={() => setShowEmojiPicker(false)}
            style={{ marginTop: 10, width: '100%', padding: '6px 0', fontSize: 12, borderRadius: 6, background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)', color: 'var(--ou-text-muted)', cursor: 'pointer' }}>
            닫기
          </button>
        </div>
      )}

      {/* 커버 URL 입력 */}
      {showCoverInput && (
        <div style={{
          position: 'fixed', zIndex: 200,
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: 'var(--ou-bg)', border: '1px solid var(--ou-border-subtle)',
          borderRadius: 'var(--ou-radius-md)', padding: 20,
          boxShadow: 'var(--ou-shadow-lg)', minWidth: 320,
        }}>
          <div style={{ fontSize: 13, color: 'var(--ou-text-secondary)', marginBottom: 10 }}>커버 이미지 URL</div>
          <input
            value={coverInput}
            onChange={(e) => setCoverInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && coverInput.trim()) {
                setCover(coverInput.trim()); save({ cover: coverInput.trim() }); setShowCoverInput(false); setCoverInput('');
              }
              if (e.key === 'Escape') setShowCoverInput(false);
            }}
            placeholder="https://..."
            autoFocus
            style={{ display: 'block', width: '100%', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--ou-border-subtle)', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--ou-text-body)', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => { if (coverInput.trim()) { setCover(coverInput.trim()); save({ cover: coverInput.trim() }); setShowCoverInput(false); setCoverInput(''); } }}
              style={{ flex: 1, padding: '7px 0', fontSize: 13, borderRadius: 6, background: 'rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.12)', color: 'var(--ou-text-heading)', cursor: 'pointer' }}>
              적용
            </button>
            <button onClick={() => setShowCoverInput(false)}
              style={{ padding: '7px 14px', fontSize: 13, borderRadius: 6, background: 'none', border: '1px solid rgba(0,0,0,0.07)', color: 'var(--ou-text-muted)', cursor: 'pointer' }}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 제목 인풋 ──────────────────────────────────────────────────
const NoteTitleInput = forwardRef<HTMLInputElement, {
  initialTitle: string;
  onSave: (title: string) => void;
  onEnter?: () => void;
}>(function NoteTitleInput({ initialTitle, onSave, onEnter }, ref) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <input
      ref={ref}
      defaultValue={initialTitle}
      onChange={(e) => {
        const title = e.target.value;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { onSave(title); }, 600);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter?.();
        }
      }}
      placeholder="제목 없음"
      style={{
        display: 'block', width: '100%', border: 'none', background: 'transparent',
        fontSize: '2.2em', fontWeight: 700, color: 'var(--ou-text-heading)',
        fontFamily: 'var(--ou-font-body)', outline: 'none', padding: 0, lineHeight: 1.2,
      }}
    />
  );
});

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
        background: active ? 'var(--ou-glass-active)' : 'transparent',
        boxShadow: active ? '0 0 0 1px var(--ou-glass-border-hover)' : 'none',
        cursor: 'pointer',
        fontSize: 11, fontWeight: active ? 600 : 400,
        color: active ? 'var(--ou-text-heading)' : 'var(--ou-text-muted)',
        transition: 'all var(--ou-transition)',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
