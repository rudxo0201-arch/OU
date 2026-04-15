'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Box, Tabs, Text, Stack, ScrollArea, Group, Badge,
  ActionIcon, Tooltip, TextInput, Textarea,
  Modal, Button, Divider, ColorSwatch, SegmentedControl,
  Title,
} from '@mantine/core';
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
  { value: 'var(--mantine-color-yellow-2)', dbValue: 'yellow-2', label: '노랑' },
  { value: 'var(--mantine-color-gray-3)', dbValue: 'gray-3', label: '회색' },
  { value: 'var(--mantine-color-gray-5)', dbValue: 'gray-5', label: '진회색' },
  { value: 'var(--mantine-color-dark-3)', dbValue: 'dark-3', label: '어두운' },
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

  // 검토 완료
  const handleReviewComplete = useCallback(async () => {
    const { modals } = await import('@mantine/modals');
    modals.openConfirmModal({
      title: '검토를 완료하시겠어요?',
      children: (
        <Text fz="xs" c="dimmed">
          꼼꼼히 확인하실수록, OU가 더 정확해집니다
        </Text>
      ),
      labels: { confirm: '완료', cancel: '취소' },
      confirmProps: { color: 'dark', size: 'xs' },
      cancelProps: { variant: 'subtle', color: 'gray', size: 'xs' },
      onConfirm: async () => {
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
        onSave?.();
      },
    });
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

  return (
    <Box p="md">
      {/* 상단 툴바: 캔버스 모드 + 액션 */}
      <Group justify="space-between" mb="xs">
        <SegmentedControl
          size="xs"
          value={canvasMode}
          onChange={(v) => setCanvasMode(v as 'infinite' | 'paged')}
          data={[
            { value: 'infinite', label: <Group gap={4}><ArrowsOutSimple size={14} /><Text fz="xs">연속</Text></Group> },
            { value: 'paged', label: <Group gap={4}><File size={14} /><Text fz="xs">페이지</Text></Group> },
          ]}
          styles={{
            root: { border: '0.5px solid var(--mantine-color-default-border)', background: 'transparent' },
          }}
        />
        <Group gap={4}>
          {fileUrl && (
            <Tooltip label="원본 보기">
              <ActionIcon
                variant="subtle" color="gray" size="sm"
                component="a" href={fileUrl} target="_blank"
              >
                <ArrowSquareOut size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="내보내기">
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setExportOpen(true)}>
              <DownloadSimple size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* 페이지 모드 */}
      {canvasMode === 'paged' ? (
        <PublishView
          nodeId={nodeId}
          title={domainData.title ?? node.raw?.slice(0, 50) ?? 'Untitled'}
          subtitle={domainData.subtitle}
        />
      ) : (
        /* 연속 모드: 탭 인터페이스 */
        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" color="gray">
          <Tabs.List>
            <Tabs.Tab value="text" leftSection={<TextAa size={14} />}>텍스트</Tabs.Tab>
            <Tabs.Tab value="summary" leftSection={<Article size={14} />}>요약</Tabs.Tab>
            <Tabs.Tab value="toc" leftSection={<ListBullets size={14} />}>목차</Tabs.Tab>
            <Tabs.Tab value="planets" leftSection={<Planet size={14} />}>연결</Tabs.Tab>
            <Tabs.Tab value="insight" leftSection={<Lightbulb size={14} />}>인사이트</Tabs.Tab>
            <Tabs.Tab
              value="annotations"
              leftSection={<NotePencil size={14} />}
              rightSection={annotations.length > 0 ? <Badge size="xs" variant="light" color="gray">{annotations.length}</Badge> : null}
            >
              내 메모
            </Tabs.Tab>
          </Tabs.List>

          {/* 검토 배너 */}
          {domainData.pdf_reviewed === false && !reviewDismissed && (
            <Group
              gap="xs" px="sm" py={6} mt="xs"
              style={{
                border: '0.5px solid var(--mantine-color-default-border)',
                borderRadius: 8,
              }}
            >
              <Badge size="xs" variant="outline" color="gray">beta</Badge>
              <Box style={{ flex: 1 }}>
                <Text fz="xs" c="dimmed">
                  자동 변환된 내용을 확인해 보세요.
                </Text>
                <Text fz={10} c="dimmed" mt={2}>
                  정확하게 검토할수록 앞으로 OU가 문서를 더 잘 이해합니다
                </Text>
              </Box>
              <Tooltip label="검토 완료">
                <ActionIcon variant="subtle" color="gray" size="xs" onClick={handleReviewComplete}>
                  <Check size={12} />
                </ActionIcon>
              </Tooltip>
              <ActionIcon variant="subtle" color="gray" size="xs" onClick={() => setReviewDismissed(true)}>
                <X size={12} />
              </ActionIcon>
            </Group>
          )}

          {/* 도구바 (텍스트 탭) */}
          {activeTab === 'text' && (
            <Stack gap={4} mt="xs">
              <Group
                gap="xs" px="sm" py={6}
                style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}
              >
                <Tooltip label="텍스트 하이라이트">
                  <ActionIcon
                    variant={activeTool === 'highlight' ? 'filled' : 'subtle'}
                    color="gray" size="sm"
                    onClick={() => setActiveTool(activeTool === 'highlight' ? null : 'highlight')}
                  >
                    <HighlighterCircle size={16} weight={activeTool === 'highlight' ? 'fill' : 'regular'} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="메모 추가">
                  <ActionIcon
                    variant={activeTool === 'note' ? 'filled' : 'subtle'}
                    color="gray" size="sm"
                    onClick={() => setActiveTool(activeTool === 'note' ? null : 'note')}
                  >
                    <NotePencil size={16} weight={activeTool === 'note' ? 'fill' : 'regular'} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="북마크">
                  <ActionIcon variant="subtle" color="gray" size="sm" onClick={handleAddBookmark}>
                    <BookmarkSimple size={16} />
                  </ActionIcon>
                </Tooltip>

                <Divider orientation="vertical" />

                {activeTool === 'highlight' && (
                  <Group gap={4}>
                    {HIGHLIGHT_COLORS.map(c => (
                      <ColorSwatch
                        key={c.value} color={c.value} size={16}
                        style={{
                          cursor: 'pointer',
                          border: activeColor.value === c.value
                            ? '2px solid var(--mantine-color-gray-3)'
                            : '1px solid var(--mantine-color-default-border)',
                        }}
                        onClick={() => setActiveColor(c)}
                      />
                    ))}
                    <Divider orientation="vertical" />
                  </Group>
                )}

                <Tooltip label="검색">
                  <ActionIcon
                    variant={searchOpen ? 'filled' : 'subtle'}
                    color="gray" size="sm"
                    onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery(''); }}
                  >
                    <MagnifyingGlass size={16} />
                  </ActionIcon>
                </Tooltip>

                {searchOpen && (
                  <TextInput
                    placeholder="검색..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    size="xs"
                    style={{ width: 140 }}
                    styles={{ input: { background: 'transparent', border: '0.5px solid var(--mantine-color-default-border)' } }}
                    rightSection={
                      searchResults.length > 0
                        ? <Text fz={10} c="dimmed">{searchResults.length}건</Text>
                        : null
                    }
                    onKeyDown={e => {
                      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
                      if (e.key === 'Enter' && searchResults.length > 0) {
                        const nextPage = searchResults.find(p => p > currentPage) ?? searchResults[0];
                        if (nextPage !== undefined) goToPage(nextPage);
                      }
                    }}
                  />
                )}

                <Group gap={4} ml="auto">
                  <Text fz="xs" c="dimmed">
                    {highlightCount > 0 && `${highlightCount} 하이라이트`}
                    {noteCount > 0 && ` · ${noteCount} 메모`}
                    {bookmarkCount > 0 && ` · ${bookmarkCount} 북마크`}
                  </Text>
                </Group>
              </Group>

              <CanvasToolbar />

              {/* 폴백 모드 페이지 네비게이션 */}
              {!useStructured && totalPages > 0 && (
                <Group justify="center" gap="xs">
                  <ActionIcon
                    variant="subtle" color="gray" size="sm"
                    disabled={currentPage === 0}
                    onClick={() => goToPage(currentPage - 1)}
                  >
                    <CaretLeft size={14} />
                  </ActionIcon>
                  <Text fz="xs" c="dimmed">{currentPage + 1} / {totalPages}</Text>
                  <ActionIcon
                    variant="subtle" color="gray" size="sm"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => goToPage(currentPage + 1)}
                  >
                    <CaretRight size={14} />
                  </ActionIcon>
                </Group>
              )}
            </Stack>
          )}

          {/* ── 텍스트 탭 ── */}
          <Tabs.Panel value="text" pt="md">
            {useStructured ? (
              <CanvasAnnotationOverlay nodeId={nodeId}>
                <StructuredDocumentView
                  nodeId={nodeId}
                  annotations={annotations}
                  activeTool={activeTool}
                  activeColor={activeColor.value}
                  searchQuery={searchQuery}
                  onTextSelection={handleStructuredSelection}
                  onAnnotationClick={handleAnnotationClick}
                  onEmpty={handleStructuredEmpty}
                />
              </CanvasAnnotationOverlay>
            ) : null}

            {!useStructured && (
              <ScrollArea h={500}>
                {currentPageText ? (
                  <Box
                    ref={textRef}
                    onMouseUp={handleFallbackSelection}
                    style={{
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.8,
                      fontSize: 'var(--mantine-font-size-sm)',
                      cursor: activeTool ? 'text' : 'default',
                      userSelect: activeTool ? 'text' : 'auto',
                    }}
                  >
                    {Array.isArray(renderedPageContent) ? (
                      renderedPageContent.map((part, idx) => {
                        if (part.annotation) {
                          const color = part.annotation.color.startsWith('var(')
                            ? part.annotation.color
                            : `var(--mantine-color-${part.annotation.color})`;
                          return (
                            <Tooltip key={idx} label={part.annotation.note_text ?? '클릭하여 메모 추가'} position="top">
                              <Text
                                span
                                style={{
                                  background: color,
                                  borderRadius: 2,
                                  padding: '0 2px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleAnnotationClick(part.annotation!)}
                              >
                                {part.text}
                              </Text>
                            </Tooltip>
                          );
                        }
                        if (part.isSearch) {
                          return (
                            <Text
                              key={idx}
                              span
                              style={{
                                background: 'var(--mantine-color-yellow-3)',
                                borderRadius: 2,
                                padding: '0 2px',
                              }}
                            >
                              {part.text}
                            </Text>
                          );
                        }
                        return <Text span key={idx}>{part.text}</Text>;
                      })
                    ) : (
                      <Text>{renderedPageContent}</Text>
                    )}
                  </Box>
                ) : (
                  <EmptyState icon={TextAa} message={
                    extractedText
                      ? '이 페이지에 텍스트가 없습니다'
                      : '텍스트 추출이 진행 중이거나 아직 처리되지 않았습니다'
                  } />
                )}
              </ScrollArea>
            )}
          </Tabs.Panel>

          {/* ── 요약 ── */}
          <Tabs.Panel value="summary" pt="md">
            <ScrollArea h={500}>
              {summary ? (
                <Text fz="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{summary}</Text>
              ) : (
                <EmptyState icon={Article} message="요약이 아직 생성되지 않았습니다" />
              )}
            </ScrollArea>
          </Tabs.Panel>

          {/* ── 목차 ── */}
          <Tabs.Panel value="toc" pt="md">
            {Array.isArray(toc) && toc.length > 0 ? (
              <Stack gap={2}>
                {toc.map((item: any, idx: number) => {
                  const heading = typeof item === 'string' ? item : item.heading ?? item.title ?? '';
                  const level = typeof item === 'object' ? (item.level ?? 1) : 1;
                  return (
                    <Group
                      key={idx} gap="xs"
                      pl={level > 1 ? (level - 1) * 16 : 0}
                      py={4}
                      style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)', cursor: 'pointer' }}
                    >
                      <Text fz="xs" c="dimmed" w={24} ta="right">{idx + 1}</Text>
                      <Text fz="sm" fw={level === 1 ? 600 : 400}>{heading}</Text>
                    </Group>
                  );
                })}
              </Stack>
            ) : (
              <EmptyState icon={ListBullets} message="목차가 아직 추출되지 않았습니다" />
            )}
          </Tabs.Panel>

          {/* ── 연결 ── */}
          <Tabs.Panel value="planets" pt="md">
            {allNodes.length > 1 ? (
              <Stack gap="xs">
                {allNodes.slice(1).map((relNode: any) => (
                  <Group key={relNode.id} px="md" py="sm" style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                    <Badge variant="light" color="gray" size="xs">{relNode.domain ?? '-'}</Badge>
                    <Text fz="sm" lineClamp={1} style={{ flex: 1 }}>
                      {relNode.raw ?? relNode.domain_data?.title ?? '(제목 없음)'}
                    </Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <EmptyState icon={Planet} message="이 문서에서 파생된 데이터가 아직 없습니다" />
            )}
          </Tabs.Panel>

          {/* ── 인사이트 ── */}
          <Tabs.Panel value="insight" pt="md">
            {Array.isArray(insights) && insights.length > 0 ? (
              <Stack gap="md">
                {insights.map((insight: any, idx: number) => (
                  <Box key={idx} p="md" style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                    <Text fz="sm" style={{ lineHeight: 1.8 }}>
                      {typeof insight === 'string' ? insight : insight.text ?? JSON.stringify(insight)}
                    </Text>
                  </Box>
                ))}
              </Stack>
            ) : (
              <EmptyState icon={Lightbulb} message="데이터가 더 쌓이면 나만의 인사이트가 생성됩니다" />
            )}
          </Tabs.Panel>

          {/* ── 내 메모 ── */}
          <Tabs.Panel value="annotations" pt="md">
            <ScrollArea h={500}>
              {annotations.length > 0 ? (
                <Stack gap="xs">
                  {annotations.map(ann => (
                    <Box
                      key={ann.id} px="md" py="sm"
                      style={{
                        border: '0.5px solid var(--mantine-color-default-border)',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                      onClick={() => setActiveTab('text')}
                    >
                      <Group justify="space-between" mb={4}>
                        <Group gap={6}>
                          <Badge variant="light" color="gray" size="xs">
                            {ann.type === 'highlight' ? '하이라이트' : ann.type === 'note' ? '메모' : '북마크'}
                          </Badge>
                          {ann.type === 'highlight' && (
                            <ColorSwatch
                              color={ann.color.startsWith('var(') ? ann.color : `var(--mantine-color-${ann.color})`}
                              size={10}
                            />
                          )}
                        </Group>
                        <Group gap={4} onClick={e => e.stopPropagation()}>
                          <ActionIcon
                            variant="subtle"
                            color={ann.importance > 0 ? 'yellow' : 'gray'}
                            size="xs"
                            onClick={() => handleToggleImportance(ann.id)}
                          >
                            <Star size={12} weight={ann.importance > 0 ? 'fill' : 'regular'} />
                          </ActionIcon>
                          {ann.type !== 'bookmark' && (
                            <ActionIcon
                              variant="subtle" color="gray" size="xs"
                              onClick={() => {
                                setNoteModal({ open: true, selectedText: ann.selected_text ?? '', editId: ann.id });
                                setNoteInput(ann.note_text ?? '');
                              }}
                            >
                              <PencilSimple size={12} />
                            </ActionIcon>
                          )}
                          <ActionIcon variant="subtle" color="gray" size="xs" onClick={() => handleDeleteAnnotation(ann.id)}>
                            <Trash size={12} />
                          </ActionIcon>
                        </Group>
                      </Group>

                      {ann.type !== 'bookmark' && ann.selected_text && (
                        <Text
                          fz="sm" lineClamp={2}
                          style={{
                            background: ann.type === 'highlight'
                              ? (ann.color.startsWith('var(') ? ann.color : `var(--mantine-color-${ann.color})`)
                              : undefined,
                            borderRadius: 2,
                            padding: ann.type === 'highlight' ? '0 4px' : undefined,
                          }}
                        >
                          {ann.selected_text}
                        </Text>
                      )}
                      {ann.note_text && (
                        <Text fz="xs" c="dimmed" mt={4} style={{ fontStyle: 'italic' }}>{ann.note_text}</Text>
                      )}
                      <Text fz="xs" c="dimmed" mt={4}>{new Date(ann.created_at).toLocaleString('ko-KR')}</Text>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <EmptyState icon={NotePencil} message="아직 메모가 없습니다. 텍스트 탭에서 하이라이트하거나 메모를 추가해보세요" />
              )}
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      )}

      {/* 메모 입력 모달 */}
      <Modal
        opened={noteModal.open}
        onClose={() => { setNoteModal({ open: false, selectedText: '' }); setNoteInput(''); pendingSelectionRef.current = null; }}
        title={<Text fw={600} fz="sm">{noteModal.editId ? '메모 수정' : '메모 추가'}</Text>}
        centered size="sm"
      >
        <Stack gap="md">
          {noteModal.selectedText && (
            <Box
              p="sm"
              style={{
                background: 'var(--mantine-color-dark-6)',
                borderRadius: 8,
                borderLeft: `3px solid ${activeColor.value}`,
              }}
            >
              <Text fz="xs" lineClamp={3}>{noteModal.selectedText}</Text>
            </Box>
          )}
          <Textarea
            placeholder="이 부분에 대한 생각, 연결되는 지식, 질문 등..."
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            minRows={3}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" size="xs"
              onClick={() => { setNoteModal({ open: false, selectedText: '' }); setNoteInput(''); pendingSelectionRef.current = null; }}
            >
              취소
            </Button>
            <Button color="gray" size="xs" leftSection={<Check size={14} />} onClick={handleSaveNote}>
              저장
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Export 모달 */}
      <Modal
        opened={exportOpen}
        onClose={() => setExportOpen(false)}
        title={<Text fw={600} fz="sm">내보내기</Text>}
        centered size="xs"
      >
        <Stack gap="sm">
          <Button
            variant="default" size="sm" fullWidth
            leftSection={<DownloadSimple size={16} />}
            onClick={() => handleExport('md')}
          >
            마크다운 (.md)
          </Button>
          <Button
            variant="default" size="sm" fullWidth
            leftSection={<DownloadSimple size={16} />}
            onClick={() => handleExport('txt')}
          >
            텍스트 (.txt)
          </Button>
          <Button
            variant="default" size="sm" fullWidth
            leftSection={<DownloadSimple size={16} />}
            onClick={() => window.print()}
          >
            인쇄 / PDF
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}

// ═══════════════════════════════════════════════════
// 심플 모드: 다중 노드 날짜별 문서 렌더링
// ═══════════════════════════════════════════════════

interface DocEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  domain: string;
}

function SimpleDocumentView({ nodes }: { nodes: any[] }) {
  const entries: DocEntry[] = useMemo(
    () =>
      nodes
        .map(n => ({
          id: n.id,
          date: n.domain_data?.date ?? n.created_at ?? '',
          title: n.domain_data?.title ?? '',
          content: n.domain_data?.content ?? n.domain_data?.description ?? n.raw ?? '',
          domain: n.domain ?? '',
        }))
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [nodes],
  );

  const grouped = useMemo(() => {
    const map: Record<string, DocEntry[]> = {};
    for (const entry of entries) {
      const key = entry.date ? dayjs(entry.date).format('YYYY-MM-DD') : '날짜 없음';
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    return Object.entries(map);
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <Stack gap="xl" p="lg" style={{ maxWidth: 720, margin: '0 auto' }}>
      {grouped.map(([dateKey, dayEntries], gi) => (
        <Box key={dateKey}>
          {gi > 0 && <Divider mb="lg" color="var(--mantine-color-default-border)" />}
          <Group gap="xs" mb="md">
            <Title order={4} fw={600} style={{ color: 'var(--mantine-color-text)' }}>
              {dateKey === '날짜 없음'
                ? dateKey
                : dayjs(dateKey).format('YYYY년 M월 D일 dddd')}
            </Title>
          </Group>
          <Stack gap="lg">
            {dayEntries.map(entry => (
              <Box
                key={entry.id}
                pl="md"
                style={{ borderLeft: '2px solid var(--mantine-color-gray-3)' }}
              >
                {entry.title && (
                  <Text fz="md" fw={600} mb={6} style={{ color: 'var(--mantine-color-text)' }}>
                    {entry.title}
                  </Text>
                )}
                <Text
                  fz="sm"
                  style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--mantine-color-text)' }}
                >
                  {entry.content}
                </Text>
                {entry.date && (
                  <Text fz={10} c="dimmed" mt={6}>
                    {dayjs(entry.date).format('A h:mm')}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

// ── 공통 ──

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <Stack align="center" py="xl">
      <Icon size={48} weight="light" color="var(--mantine-color-gray-5)" />
      <Text fz="sm" c="dimmed">{message}</Text>
    </Stack>
  );
}
