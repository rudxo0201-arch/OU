'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
// All UI uses native HTML + inline styles (no component library imports)
import {
  TextAa, ListBullets, Planet, Lightbulb, Article,
  HighlighterCircle, NotePencil, BookmarkSimple,
  Star, PencilSimple, Trash, X, Check,
  CaretLeft, CaretRight, MagnifyingGlass, BookOpen,
  ArrowsOutSimple, File, DownloadSimple, ArrowSquareOut,
} from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';
import { useAnnotations } from '@/hooks/useAnnotations';
import { StructuredDocumentView, type SelectionInfo } from '@/components/views/document/StructuredDocumentView';
import { CanvasAnnotationOverlay } from '@/components/canvas-annotation/CanvasAnnotationOverlay';
import { CanvasToolbar } from '@/components/canvas-annotation/CanvasToolbar';
import type { Annotation } from '@/hooks/useAnnotations';

dayjs.locale('ko');

const PublishView = dynamic(
  () => import('./document/PublishView').then(m => ({ default: m.PublishView })),
  { ssr: false },
);

// ── 상수 ──

const HIGHLIGHT_COLORS = [
  { value: 'var(--ou-yellow-2, #fff3bf)', dbValue: 'yellow-2', label: '노랑' },
  { value: 'var(--ou-gray-3, #ccc)', dbValue: 'gray-3', label: '회색' },
  { value: 'var(--ou-gray-5, #888)', dbValue: 'gray-5', label: '진회색' },
  { value: 'var(--ou-gray-7, #444)', dbValue: 'dark-3', label: '어두운' },
];

const CHARS_PER_PAGE = 3000;

// ── 유틸 ──

function splitIntoPages(text: string): string[] {
  if (!text) return [];
  if (text.includes('\f')) {
    return text.split('\f').filter(p => p.trim().length > 0);
  }
  const pages: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= CHARS_PER_PAGE) {
      pages.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf('\n\n', CHARS_PER_PAGE);
    if (splitAt < CHARS_PER_PAGE * 0.5) {
      splitAt = remaining.lastIndexOf('\n', CHARS_PER_PAGE);
    }
    if (splitAt < CHARS_PER_PAGE * 0.5) {
      splitAt = CHARS_PER_PAGE;
    }
    pages.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return pages;
}

function generateMarkdown(nodes: any[]): string {
  const entries = nodes
    .map(n => ({
      date: n.domain_data?.date ?? n.created_at ?? '',
      title: n.domain_data?.title ?? '',
      content: n.domain_data?.content ?? n.domain_data?.description ?? n.raw ?? '',
    }))
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  const lines: string[] = [];
  for (const entry of entries) {
    if (entry.title) lines.push(`## ${entry.title}\n`);
    lines.push(entry.content);
    if (entry.date) lines.push(`\n> ${dayjs(entry.date).format('YYYY-MM-DD A h:mm')}`);
    lines.push('');
  }
  return lines.join('\n');
}

function generatePlainText(nodes: any[]): string {
  const entries = nodes
    .map(n => ({
      date: n.domain_data?.date ?? n.created_at ?? '',
      title: n.domain_data?.title ?? '',
      content: n.domain_data?.content ?? n.domain_data?.description ?? n.raw ?? '',
    }))
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  const lines: string[] = [];
  for (const entry of entries) {
    if (entry.title) {
      lines.push(entry.title);
      lines.push('-'.repeat(entry.title.length * 2));
    }
    lines.push(entry.content);
    if (entry.date) lines.push(`(${dayjs(entry.date).format('YYYY-MM-DD A h:mm')})`);
    lines.push('');
  }
  return lines.join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── 리치 모드 판별 ──

function isRichMode(nodes: any[]): boolean {
  if (nodes.length !== 1) return false;
  const node = nodes[0];
  return (
    node.source_file_type === 'pdf' ||
    node.domain_data?.sections?.length > 0 ||
    node.domain_data?.extracted_text
  );
}

// ── 메인 컴포넌트 ──

export function DocumentView({ nodes, onSave }: ViewProps) {
  if (isRichMode(nodes)) {
    return <RichDocumentView node={nodes[0]} allNodes={nodes} onSave={onSave} />;
  }
  return <SimpleDocumentView nodes={nodes} />;
}

// ═══════════════════════════════════════════════════
// 리치 모드: 구조화 텍스트 + 어노테이션 + 캔버스 모드
// ═══════════════════════════════════════════════════

function RichDocumentView({ node, allNodes, onSave }: { node: any; allNodes: any[]; onSave?: () => void }) {
  const [canvasMode, setCanvasMode] = useState<'infinite' | 'paged'>('infinite');
  const [activeTab, setActiveTab] = useState<string | null>('text');
  const [activeTool, setActiveTool] = useState<'highlight' | 'note' | 'bookmark' | null>(null);
  const [activeColor, setActiveColor] = useState(HIGHLIGHT_COLORS[0]);
  const [noteModal, setNoteModal] = useState<{ open: boolean; selectedText: string; editId?: string }>({
    open: false, selectedText: '',
  });
  const [noteInput, setNoteInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // 폴백용 페이지 상태
  const [currentPage, setCurrentPage] = useState(0);
  const [useStructured, setUseStructured] = useState(true);
  const textRef = useRef<HTMLDivElement>(null);
  const pendingSelectionRef = useRef<SelectionInfo | null>(null);

  const nodeId = node.id;
  const domainData = node.domain_data ?? {};
  const fileUrl = domainData.file_url ?? domainData.url ?? null;
  const extractedText: string = domainData.extracted_text ?? node.raw ?? '';
  const summary = domainData.summary ?? '';
  const toc = domainData.toc ?? domainData.headings ?? [];
  const insights = domainData.insights ?? [];

  // 어노테이션
  const {
    annotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = useAnnotations(nodeId);

  const [reviewConfirmOpen, setReviewConfirmOpen] = useState(false);

  // 검토 완료
  const handleReviewComplete = useCallback(async () => {
    setReviewConfirmOpen(true);
  }, []);

  const handleReviewConfirm = useCallback(async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase
      .from('data_nodes')
      .update({
        domain_data: {
          ...domainData,
          pdf_reviewed: true,
          pdf_reviewed_at: new Date().toISOString(),
        },
        confidence: 'high',
      })
      .eq('id', nodeId);
    setReviewDismissed(true);
    setReviewConfirmOpen(false);
    onSave?.();
  }, [nodeId, domainData, onSave]);

  // 폴백용 페이지 분할
  const pages = useMemo(() => splitIntoPages(extractedText), [extractedText]);
  const totalPages = pages.length;
  const currentPageText = pages[currentPage] ?? '';

  // 카운트
  const highlightCount = annotations.filter(a => a.type === 'highlight').length;
  const noteCount = annotations.filter(a => a.type === 'note').length;
  const bookmarkCount = annotations.filter(a => a.type === 'bookmark').length;

  // 검색 결과 (폴백 모드)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return pages
      .map((page, idx) => ({ idx, has: page.toLowerCase().includes(q) }))
      .filter(r => r.has)
      .map(r => r.idx);
  }, [pages, searchQuery]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(totalPages - 1, page)));
  }, [totalPages]);

  // 구조화 모드: 텍스트 선택 → 어노테이션
  const handleStructuredSelection = useCallback((info: SelectionInfo) => {
    if (!activeTool) return;

    if (activeTool === 'highlight') {
      createAnnotation({
        type: 'highlight',
        selected_text: info.selectedText,
        color: activeColor.dbValue,
        section_id: info.sectionId ?? undefined,
        sentence_ids: info.sentenceIds,
        position: {
          sentence_ids: info.sentenceIds,
          start_sentence_id: info.startSentenceId,
          start_offset: info.startOffset,
          end_sentence_id: info.endSentenceId,
          end_offset: info.endOffset,
        },
      });
    } else if (activeTool === 'note') {
      setNoteModal({ open: true, selectedText: info.selectedText });
      pendingSelectionRef.current = info;
    }
  }, [activeTool, activeColor, createAnnotation]);

  // 어노테이션 클릭
  const handleAnnotationClick = useCallback((ann: Annotation) => {
    setNoteModal({
      open: true,
      selectedText: ann.selected_text ?? '',
      editId: ann.id,
    });
    setNoteInput(ann.note_text ?? '');
  }, []);

  // 메모 저장
  const handleSaveNote = useCallback(() => {
    if (noteModal.editId) {
      updateAnnotation(noteModal.editId, { note_text: noteInput });
    } else {
      const info = pendingSelectionRef.current;
      createAnnotation({
        type: 'note',
        selected_text: noteModal.selectedText,
        note_text: noteInput,
        color: activeColor.dbValue,
        section_id: info?.sectionId ?? undefined,
        sentence_ids: info?.sentenceIds,
        position: info ? {
          sentence_ids: info.sentenceIds,
          start_sentence_id: info.startSentenceId,
          start_offset: info.startOffset,
          end_sentence_id: info.endSentenceId,
          end_offset: info.endOffset,
        } : undefined,
      });
      pendingSelectionRef.current = null;
    }
    setNoteModal({ open: false, selectedText: '' });
    setNoteInput('');
  }, [noteModal, noteInput, activeColor, createAnnotation, updateAnnotation]);

  // 북마크
  const handleAddBookmark = useCallback(() => {
    createAnnotation({
      type: 'bookmark',
      selected_text: '북마크',
      color: 'yellow-2',
      importance: 1,
    });
  }, [createAnnotation]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    deleteAnnotation(id);
  }, [deleteAnnotation]);

  const handleToggleImportance = useCallback((id: string) => {
    const ann = annotations.find(a => a.id === id);
    if (ann) {
      updateAnnotation(id, { importance: ann.importance > 0 ? 0 : 1 });
    }
  }, [annotations, updateAnnotation]);

  // 폴백 모드: 텍스트 선택
  const handleFallbackSelection = useCallback(() => {
    if (!activeTool) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    if (activeTool === 'highlight') {
      createAnnotation({
        type: 'highlight',
        selected_text: selectedText,
        color: activeColor.dbValue,
      });
      selection.removeAllRanges();
    } else if (activeTool === 'note') {
      setNoteModal({ open: true, selectedText });
      pendingSelectionRef.current = null;
      selection.removeAllRanges();
    }
  }, [activeTool, activeColor, createAnnotation]);

  // 폴백 렌더링
  const renderedPageContent = useMemo(() => {
    if (!currentPageText) return null;
    const highlights = annotations.filter(a =>
      (a.type === 'highlight' || a.type === 'note') && !a.position?.sentence_ids
    );
    if (highlights.length === 0 && !searchQuery.trim()) return currentPageText;

    const parts: { text: string; annotation?: Annotation; isSearch?: boolean }[] = [];
    type Match = { start: number; end: number; annotation?: Annotation; isSearch?: boolean };
    const matches: Match[] = [];

    for (const ann of highlights) {
      if (!ann.selected_text) continue;
      const idx = currentPageText.indexOf(ann.selected_text);
      if (idx >= 0) {
        matches.push({ start: idx, end: idx + ann.selected_text.length, annotation: ann });
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      let searchIdx = 0;
      while (true) {
        const found = currentPageText.toLowerCase().indexOf(q, searchIdx);
        if (found < 0) break;
        matches.push({ start: found, end: found + q.length, isSearch: true });
        searchIdx = found + 1;
      }
    }

    matches.sort((a, b) => a.start - b.start);
    const cleaned: Match[] = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.start >= cursor) {
        cleaned.push(m);
        cursor = m.end;
      }
    }

    let pos = 0;
    for (const m of cleaned) {
      if (m.start > pos) {
        parts.push({ text: currentPageText.slice(pos, m.start) });
      }
      parts.push({
        text: currentPageText.slice(m.start, m.end),
        annotation: m.annotation,
        isSearch: m.isSearch,
      });
      pos = m.end;
    }
    if (pos < currentPageText.length) {
      parts.push({ text: currentPageText.slice(pos) });
    }

    return parts;
  }, [currentPageText, annotations, searchQuery]);

  const handleStructuredEmpty = useCallback(() => {
    setUseStructured(false);
  }, []);

  // Export 핸들러
  const handleExport = useCallback((format: 'md' | 'txt') => {
    const dateStr = dayjs().format('YYYYMMDD');
    if (format === 'md') {
      downloadFile(generateMarkdown(allNodes), `내기록_${dateStr}.md`, 'text/markdown;charset=utf-8');
    } else {
      downloadFile(generatePlainText(allNodes), `내기록_${dateStr}.txt`, 'text/plain;charset=utf-8');
    }
    setExportOpen(false);
  }, [allNodes]);

  const TAB_ITEMS = [
    { value: 'text', icon: <TextAa size={14} />, label: '텍스트' },
    { value: 'summary', icon: <Article size={14} />, label: '요약' },
    { value: 'toc', icon: <ListBullets size={14} />, label: '목차' },
    { value: 'planets', icon: <Planet size={14} />, label: '연결' },
    { value: 'insight', icon: <Lightbulb size={14} />, label: '인사이트' },
    { value: 'annotations', icon: <NotePencil size={14} />, label: '내 메모', badge: annotations.length > 0 ? annotations.length : undefined },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* 상단 툴바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 0, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, overflow: 'hidden' }}>
          {(['infinite', 'paged'] as const).map(mode => (
            <button key={mode} onClick={() => setCanvasMode(mode)} style={{
              display: 'flex', gap: 4, alignItems: 'center', padding: '4px 12px', fontSize: 12, border: 'none',
              background: canvasMode === mode ? 'var(--ou-bg-subtle, rgba(255,255,255,0.08))' : 'transparent',
              cursor: 'pointer', color: 'inherit',
            }}>
              {mode === 'infinite' ? <ArrowsOutSimple size={14} /> : <File size={14} />}
              <span>{mode === 'infinite' ? '연속' : '페이지'}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noreferrer" title="원본 보기" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'inherit', display: 'flex', alignItems: 'center' }}>
              <ArrowSquareOut size={16} />
            </a>
          )}
          <button onClick={() => setExportOpen(true)} title="내보내기" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'inherit', display: 'flex', alignItems: 'center' }}>
            <DownloadSimple size={16} />
          </button>
        </div>
      </div>

      {canvasMode === 'paged' ? (
        <PublishView nodeId={nodeId} title={domainData.title ?? node.raw?.slice(0, 50) ?? 'Untitled'} subtitle={domainData.subtitle} />
      ) : (
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid var(--ou-border, #333)', marginBottom: 0 }}>
            {TAB_ITEMS.map(t => (
              <button key={t.value} onClick={() => setActiveTab(t.value)} style={{
                display: 'flex', gap: 4, alignItems: 'center', padding: '8px 12px', fontSize: 12, border: 'none',
                borderBottom: activeTab === t.value ? '2px solid currentColor' : '2px solid transparent',
                background: 'none', cursor: 'pointer', color: activeTab === t.value ? 'inherit' : 'var(--ou-text-dimmed, #888)',
              }}>
                {t.icon}
                <span>{t.label}</span>
                {t.badge && <span style={{ fontSize: 10, padding: '0 4px', borderRadius: 4, backgroundColor: 'var(--ou-bg-subtle, rgba(255,255,255,0.06))', marginLeft: 4 }}>{t.badge}</span>}
              </button>
            ))}
          </div>

          {/* 검토 배너 */}
          {domainData.pdf_reviewed === false && !reviewDismissed && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px', marginTop: 8, border: '0.5px solid var(--ou-border, #333)', borderRadius: 8 }}>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, border: '0.5px solid var(--ou-border, #333)' }}>beta</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed, #888)', display: 'block' }}>자동 변환된 내용을 확인해 보세요.</span>
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginTop: 2 }}>정확하게 검토할수록 앞으로 OU가 문서를 더 잘 이해합니다</span>
              </div>
              <button onClick={handleReviewComplete} title="검토 완료" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'inherit', display: 'flex', alignItems: 'center' }}><Check size={12} /></button>
              <button onClick={() => setReviewDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'inherit', display: 'flex', alignItems: 'center' }}><X size={12} /></button>
            </div>
          )}

          {/* Toolbar (text tab) */}
          {activeTab === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setActiveTool(activeTool === 'highlight' ? null : 'highlight')} title="텍스트 하이라이트" style={{ background: activeTool === 'highlight' ? 'var(--ou-bg-subtle, rgba(255,255,255,0.1))' : 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'inherit', display: 'flex', alignItems: 'center' }}><HighlighterCircle size={16} weight={activeTool === 'highlight' ? 'fill' : 'regular'} /></button>
                <button onClick={() => setActiveTool(activeTool === 'note' ? null : 'note')} title="메모 추가" style={{ background: activeTool === 'note' ? 'var(--ou-bg-subtle, rgba(255,255,255,0.1))' : 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'inherit', display: 'flex', alignItems: 'center' }}><NotePencil size={16} weight={activeTool === 'note' ? 'fill' : 'regular'} /></button>
                <button onClick={handleAddBookmark} title="북마크" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'inherit', display: 'flex', alignItems: 'center' }}><BookmarkSimple size={16} /></button>
                <div style={{ width: 1, height: 16, backgroundColor: 'var(--ou-border, #333)' }} />
                {activeTool === 'highlight' && (
                  <>
                    {HIGHLIGHT_COLORS.map(c => (
                      <div key={c.value} onClick={() => setActiveColor(c)} style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: c.value, cursor: 'pointer', border: activeColor.value === c.value ? '2px solid var(--ou-gray-3, #ccc)' : '1px solid var(--ou-border, #333)' }} />
                    ))}
                    <div style={{ width: 1, height: 16, backgroundColor: 'var(--ou-border, #333)' }} />
                  </>
                )}
                <button onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery(''); }} title="검색" style={{ background: searchOpen ? 'var(--ou-bg-subtle, rgba(255,255,255,0.1))' : 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'inherit', display: 'flex', alignItems: 'center' }}><MagnifyingGlass size={16} /></button>
                {searchOpen && (
                  <input placeholder="검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } if (e.key === 'Enter' && searchResults.length > 0) { const nextPage = searchResults.find(p => p > currentPage) ?? searchResults[0]; if (nextPage !== undefined) goToPage(nextPage); } }} style={{ width: 140, fontSize: 12, padding: '2px 8px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4, background: 'transparent', color: 'inherit', outline: 'none' }} />
                )}
                <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed, #888)', marginLeft: 'auto' }}>
                  {highlightCount > 0 && `${highlightCount} 하이라이트`}{noteCount > 0 && ` · ${noteCount} 메모`}{bookmarkCount > 0 && ` · ${bookmarkCount} 북마크`}
                </span>
              </div>
              <CanvasToolbar />
              {!useStructured && totalPages > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
                  <button disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)} style={{ background: 'none', border: 'none', cursor: currentPage === 0 ? 'default' : 'pointer', padding: 4, color: 'inherit', opacity: currentPage === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center' }}><CaretLeft size={14} /></button>
                  <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed, #888)' }}>{currentPage + 1} / {totalPages}</span>
                  <button disabled={currentPage >= totalPages - 1} onClick={() => goToPage(currentPage + 1)} style={{ background: 'none', border: 'none', cursor: currentPage >= totalPages - 1 ? 'default' : 'pointer', padding: 4, color: 'inherit', opacity: currentPage >= totalPages - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center' }}><CaretRight size={14} /></button>
                </div>
              )}
            </div>
          )}

          {/* Tab panels */}
          {activeTab === 'text' && (
            <div style={{ paddingTop: 16 }}>
              {useStructured ? (<CanvasAnnotationOverlay nodeId={nodeId}><StructuredDocumentView nodeId={nodeId} annotations={annotations} activeTool={activeTool} activeColor={activeColor.value} searchQuery={searchQuery} onTextSelection={handleStructuredSelection} onAnnotationClick={handleAnnotationClick} onEmpty={handleStructuredEmpty} /></CanvasAnnotationOverlay>) : null}
              {!useStructured && (
                <div style={{ maxHeight: 500, overflow: 'auto' }}>
                  {currentPageText ? (
                    <div ref={textRef} onMouseUp={handleFallbackSelection} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 13, cursor: activeTool ? 'text' : 'default', userSelect: activeTool ? 'text' : 'auto' }}>
                      {Array.isArray(renderedPageContent) ? renderedPageContent.map((part, idx) => {
                        if (part.annotation) { const color = part.annotation.color.startsWith('var(') ? part.annotation.color : `var(--ou-color-${part.annotation.color})`; return (<span key={idx} title={part.annotation.note_text ?? '클릭하여 메모 추가'} onClick={() => handleAnnotationClick(part.annotation!)} style={{ background: color, borderRadius: 2, padding: '0 2px', cursor: 'pointer' }}>{part.text}</span>); }
                        if (part.isSearch) return (<span key={idx} style={{ background: 'var(--ou-yellow-3, #ffd43b)', borderRadius: 2, padding: '0 2px' }}>{part.text}</span>);
                        return <span key={idx}>{part.text}</span>;
                      }) : <span>{renderedPageContent}</span>}
                    </div>
                  ) : (<EmptyState icon={TextAa} message={extractedText ? '이 페이지에 텍스트가 없습니다' : '텍스트 추출이 진행 중이거나 아직 처리되지 않았습니다'} />)}
                </div>
              )}
            </div>
          )}
          {activeTab === 'summary' && (<div style={{ paddingTop: 16, maxHeight: 500, overflow: 'auto' }}>{summary ? (<p style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0 }}>{summary}</p>) : (<EmptyState icon={Article} message="요약이 아직 생성되지 않았습니다" />)}</div>)}
          {activeTab === 'toc' && (<div style={{ paddingTop: 16 }}>{Array.isArray(toc) && toc.length > 0 ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{toc.map((item: any, idx: number) => { const heading = typeof item === 'string' ? item : item.heading ?? item.title ?? ''; const level = typeof item === 'object' ? (item.level ?? 1) : 1; return (<div key={idx} style={{ display: 'flex', gap: 8, paddingLeft: level > 1 ? (level - 1) * 16 : 0, padding: '4px 0', borderBottom: '0.5px solid var(--ou-border, #333)', cursor: 'pointer' }}><span style={{ fontSize: 12, color: 'var(--ou-text-dimmed, #888)', width: 24, textAlign: 'right' }}>{idx + 1}</span><span style={{ fontSize: 13, fontWeight: level === 1 ? 600 : 400 }}>{heading}</span></div>); })}</div>) : (<EmptyState icon={ListBullets} message="목차가 아직 추출되지 않았습니다" />)}</div>)}
          {activeTab === 'planets' && (<div style={{ paddingTop: 16 }}>{allNodes.length > 1 ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{allNodes.slice(1).map((relNode: any) => (<div key={relNode.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 16px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 8 }}><span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, backgroundColor: 'var(--ou-bg-subtle, rgba(255,255,255,0.06))', color: 'var(--ou-text-dimmed, #888)' }}>{relNode.domain ?? '-'}</span><span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{relNode.raw ?? relNode.domain_data?.title ?? '(제목 없음)'}</span></div>))}</div>) : (<EmptyState icon={Planet} message="이 문서에서 파생된 데이터가 아직 없습니다" />)}</div>)}
          {activeTab === 'insight' && (<div style={{ paddingTop: 16 }}>{Array.isArray(insights) && insights.length > 0 ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{insights.map((insight: any, idx: number) => (<div key={idx} style={{ padding: 16, border: '0.5px solid var(--ou-border, #333)', borderRadius: 8 }}><p style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>{typeof insight === 'string' ? insight : insight.text ?? JSON.stringify(insight)}</p></div>))}</div>) : (<EmptyState icon={Lightbulb} message="데이터가 더 쌓이면 나만의 인사이트가 생성됩니다" />)}</div>)}
          {activeTab === 'annotations' && (<div style={{ paddingTop: 16, maxHeight: 500, overflow: 'auto' }}>{annotations.length > 0 ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{annotations.map(ann => (<div key={ann.id} onClick={() => setActiveTab('text')} style={{ padding: '8px 16px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 8, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, backgroundColor: 'var(--ou-bg-subtle, rgba(255,255,255,0.06))', color: 'var(--ou-text-dimmed, #888)' }}>{ann.type === 'highlight' ? '하이라이트' : ann.type === 'note' ? '메모' : '북마크'}</span>
                {ann.type === 'highlight' && (<div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: ann.color.startsWith('var(') ? ann.color : `var(--ou-color-${ann.color})` }} />)}
              </div>
              <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => handleToggleImportance(ann.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: ann.importance > 0 ? 'var(--mantine-color-yellow-5, #ffd43b)' : 'inherit', display: 'flex', alignItems: 'center' }}><Star size={12} weight={ann.importance > 0 ? 'fill' : 'regular'} /></button>
                {ann.type !== 'bookmark' && (<button onClick={() => { setNoteModal({ open: true, selectedText: ann.selected_text ?? '', editId: ann.id }); setNoteInput(ann.note_text ?? ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'inherit', display: 'flex', alignItems: 'center' }}><PencilSimple size={12} /></button>)}
                <button onClick={() => handleDeleteAnnotation(ann.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'inherit', display: 'flex', alignItems: 'center' }}><Trash size={12} /></button>
              </div>
            </div>
            {ann.type !== 'bookmark' && ann.selected_text && (<p style={{ fontSize: 13, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', background: ann.type === 'highlight' ? (ann.color.startsWith('var(') ? ann.color : `var(--ou-color-${ann.color})`) : undefined, borderRadius: 2, padding: ann.type === 'highlight' ? '0 4px' : undefined }}>{ann.selected_text}</p>)}
            {ann.note_text && (<p style={{ fontSize: 12, color: 'var(--ou-text-dimmed, #888)', marginTop: 4, fontStyle: 'italic', margin: '4px 0 0' }}>{ann.note_text}</p>)}
            <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginTop: 4 }}>{new Date(ann.created_at).toLocaleString('ko-KR')}</span>
          </div>))}</div>) : (<EmptyState icon={NotePencil} message="아직 메모가 없습니다. 텍스트 탭에서 하이라이트하거나 메모를 추가해보세요" />)}</div>)}
        </div>
      )}

      {/* Note modal */}
      {noteModal.open && (<div onClick={() => { setNoteModal({ open: false, selectedText: '' }); setNoteInput(''); pendingSelectionRef.current = null; }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--ou-bg, #111)', borderRadius: 12, width: '90%', maxWidth: 400, border: '0.5px solid var(--ou-border, #333)', padding: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 12 }}>{noteModal.editId ? '메모 수정' : '메모 추가'}</span>
          {noteModal.selectedText && (<div style={{ padding: 12, background: 'var(--ou-bg-subtle, rgba(255,255,255,0.04))', borderRadius: 8, borderLeft: `3px solid ${activeColor.value}`, marginBottom: 12 }}><p style={{ fontSize: 12, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{noteModal.selectedText}</p></div>)}
          <textarea placeholder="이 부분에 대한 생각, 연결되는 지식, 질문 등..." value={noteInput} onChange={e => setNoteInput(e.target.value)} autoFocus rows={3} style={{ width: '100%', fontSize: 13, padding: 8, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', color: 'inherit', resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: 12 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => { setNoteModal({ open: false, selectedText: '' }); setNoteInput(''); pendingSelectionRef.current = null; }} style={{ padding: '6px 16px', fontSize: 12, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ou-text-dimmed, #888)' }}>취소</button>
            <button onClick={handleSaveNote} style={{ padding: '6px 16px', fontSize: 12, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} />저장</button>
          </div>
        </div>
      </div>)}

      {/* Export modal */}
      {exportOpen && (<div onClick={() => setExportOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--ou-bg, #111)', borderRadius: 12, width: '90%', maxWidth: 320, border: '0.5px solid var(--ou-border, #333)', padding: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 12 }}>내보내기</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ label: '마크다운 (.md)', action: () => handleExport('md') }, { label: '텍스트 (.txt)', action: () => handleExport('txt') }, { label: '인쇄 / PDF', action: () => window.print() }].map(item => (
              <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'inherit', fontSize: 13, width: '100%' }}><DownloadSimple size={16} />{item.label}</button>
            ))}
          </div>
        </div>
      </div>)}

      {/* Review confirm modal */}
      {reviewConfirmOpen && (<div onClick={() => setReviewConfirmOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--ou-bg, #111)', borderRadius: 12, width: '90%', maxWidth: 360, border: '0.5px solid var(--ou-border, #333)', padding: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>검토를 완료하시겠어요?</span>
          <p style={{ fontSize: 12, color: 'var(--ou-text-dimmed, #888)', margin: '0 0 16px' }}>꼼꼼히 확인하실수록, OU가 더 정확해집니다</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setReviewConfirmOpen(false)} style={{ padding: '6px 16px', fontSize: 12, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ou-text-dimmed, #888)' }}>취소</button>
            <button onClick={handleReviewConfirm} style={{ padding: '6px 16px', fontSize: 12, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'inherit' }}>완료</button>
          </div>
        </div>
      </div>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Simple mode
// ═══════════════════════════════════════════════════

interface DocEntry { id: string; date: string; title: string; content: string; domain: string; }

function SimpleDocumentView({ nodes }: { nodes: any[] }) {
  const entries: DocEntry[] = useMemo(() => nodes.map(n => ({ id: n.id, date: n.domain_data?.date ?? n.created_at ?? '', title: n.domain_data?.title ?? '', content: n.domain_data?.content ?? n.domain_data?.description ?? n.raw ?? '', domain: n.domain ?? '' })).sort((a, b) => (a.date > b.date ? -1 : 1)), [nodes]);
  const grouped = useMemo(() => { const map: Record<string, DocEntry[]> = {}; for (const entry of entries) { const key = entry.date ? dayjs(entry.date).format('YYYY-MM-DD') : '날짜 없음'; if (!map[key]) map[key] = []; map[key].push(entry); } return Object.entries(map); }, [entries]);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: 24, maxWidth: 720, margin: '0 auto' }}>
      {grouped.map(([dateKey, dayEntries], gi) => (
        <div key={dateKey}>
          {gi > 0 && <div style={{ borderTop: '0.5px solid var(--ou-border, #333)', marginBottom: 24 }} />}
          <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, marginTop: 0 }}>{dateKey === '날짜 없음' ? dateKey : dayjs(dateKey).format('YYYY년 M월 D일 dddd')}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {dayEntries.map(entry => (
              <div key={entry.id} style={{ paddingLeft: 16, borderLeft: '2px solid var(--ou-gray-3, #ccc)' }}>
                {entry.title && (<span style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>{entry.title}</span>)}
                <p style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{entry.content}</p>
                {entry.date && (<span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginTop: 6 }}>{dayjs(entry.date).format('A h:mm')}</span>)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
      <Icon size={48} weight="light" color="var(--ou-gray-5, #888)" />
      <span style={{ fontSize: 13, color: 'var(--ou-text-dimmed, #888)', marginTop: 8 }}>{message}</span>
    </div>
  );
}
