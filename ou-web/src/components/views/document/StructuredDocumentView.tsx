'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Annotation } from '@/hooks/useAnnotations';

// ── 타입 ──

interface Section {
  id: string;
  heading: string | null;
  order_idx: number;
  sentences: Sentence[];
}

interface Sentence {
  id: string;
  text: string;
  order_idx: number;
}

interface StructuredDocumentViewProps {
  nodeId: string;
  annotations: Annotation[];
  activeTool: 'highlight' | 'note' | 'bookmark' | null;
  activeColor: string;
  searchQuery: string;
  onTextSelection: (selection: SelectionInfo) => void;
  onAnnotationClick: (annotation: Annotation) => void;
  onEmpty?: () => void;
}

export interface SelectionInfo {
  selectedText: string;
  sentenceIds: string[];
  startSentenceId: string;
  startOffset: number;
  endSentenceId: string;
  endOffset: number;
  sectionId: string | null;
}

// ── 유틸 ──

function resolveSelectionToSentences(selection: Selection): SelectionInfo | null {
  const range = selection.getRangeAt(0);

  const findSentenceEl = (node: Node): HTMLElement | null => {
    let el = node instanceof HTMLElement ? node : node.parentElement;
    while (el) {
      if (el.hasAttribute('data-sentence-id')) return el;
      el = el.parentElement;
    }
    return null;
  };

  const startEl = findSentenceEl(range.startContainer);
  const endEl = findSentenceEl(range.endContainer);
  if (!startEl || !endEl) return null;

  const startSentenceId = startEl.getAttribute('data-sentence-id')!;
  const endSentenceId = endEl.getAttribute('data-sentence-id')!;

  // 사이에 있는 모든 sentence-id 수집
  const container = startEl.closest('[data-document-container]');
  if (!container) return null;

  const allSentenceEls = Array.from(container.querySelectorAll('[data-sentence-id]'));
  const sentenceIds: string[] = [];
  let collecting = false;

  for (const el of allSentenceEls) {
    const sid = el.getAttribute('data-sentence-id')!;
    if (sid === startSentenceId) collecting = true;
    if (collecting) sentenceIds.push(sid);
    if (sid === endSentenceId) break;
  }

  // section 찾기 (시작 문장의 section)
  const sectionEl = startEl.closest('[data-section-id]');
  const sectionId = sectionEl?.getAttribute('data-section-id') ?? null;

  return {
    selectedText: selection.toString().trim(),
    sentenceIds,
    startSentenceId,
    startOffset: range.startOffset,
    endSentenceId,
    endOffset: range.endOffset,
    sectionId,
  };
}

// ── 하이라이트 매핑 ──

interface SentenceAnnotationMap {
  [sentenceId: string]: {
    annotation: Annotation;
    isStart: boolean;
    isEnd: boolean;
    startOffset?: number;
    endOffset?: number;
  }[];
}

function buildAnnotationMap(annotations: Annotation[]): SentenceAnnotationMap {
  const map: SentenceAnnotationMap = {};

  for (const ann of annotations) {
    if (ann.type === 'bookmark') continue;
    const pos = ann.position;
    if (!pos?.sentence_ids?.length) continue;

    for (const sid of pos.sentence_ids) {
      if (!map[sid]) map[sid] = [];
      map[sid].push({
        annotation: ann,
        isStart: sid === pos.start_sentence_id,
        isEnd: sid === pos.end_sentence_id,
        startOffset: sid === pos.start_sentence_id ? pos.start_offset : undefined,
        endOffset: sid === pos.end_sentence_id ? pos.end_offset : undefined,
      });
    }
  }

  return map;
}

// ── 문장 렌더링 (하이라이트/검색 적용) ──

function SentenceSpan({
  sentence,
  annotationEntries,
  searchQuery,
  onAnnotationClick,
}: {
  sentence: Sentence;
  annotationEntries?: SentenceAnnotationMap[string];
  searchQuery: string;
  onAnnotationClick: (annotation: Annotation) => void;
}) {
  const text = sentence.text;

  // 매칭 영역 수집
  type Match = { start: number; end: number; annotation?: Annotation; isSearch?: boolean };
  const matches: Match[] = [];

  // 어노테이션 매칭
  if (annotationEntries) {
    for (const entry of annotationEntries) {
      const start = entry.isStart && entry.startOffset !== undefined ? entry.startOffset : 0;
      const end = entry.isEnd && entry.endOffset !== undefined ? entry.endOffset : text.length;
      matches.push({ start, end: Math.min(end, text.length), annotation: entry.annotation });
    }
  }

  // 검색 매칭
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    let idx = 0;
    while (true) {
      const found = text.toLowerCase().indexOf(q, idx);
      if (found < 0) break;
      matches.push({ start: found, end: found + q.length, isSearch: true });
      idx = found + 1;
    }
  }

  // 단순 텍스트 (매칭 없음)
  if (matches.length === 0) {
    return (
      <span data-sentence-id={sentence.id}>
        {text}
      </span>
    );
  }

  // 위치순 정렬 + 겹침 제거
  matches.sort((a, b) => a.start - b.start);
  const cleaned: Match[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start >= cursor) {
      cleaned.push(m);
      cursor = m.end;
    }
  }

  // 파트 생성
  const parts: React.ReactNode[] = [];
  let pos = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const m = cleaned[i];
    if (m.start > pos) {
      parts.push(<span key={`t-${i}`}>{text.slice(pos, m.start)}</span>);
    }
    if (m.annotation) {
      parts.push(
        <span
          key={`a-${i}`}
          style={{
            background: m.annotation.color.startsWith('var(')
              ? m.annotation.color
              : `var(--mantine-color-${m.annotation.color})`,
            borderRadius: 2,
            padding: '0 2px',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAnnotationClick(m.annotation!);
          }}
        >
          {text.slice(m.start, m.end)}
        </span>
      );
    } else if (m.isSearch) {
      parts.push(
        <span
          key={`s-${i}`}
          style={{
            background: 'var(--mantine-color-yellow-3)',
            borderRadius: 2,
            padding: '0 2px',
          }}
        >
          {text.slice(m.start, m.end)}
        </span>
      );
    }
    pos = m.end;
  }
  if (pos < text.length) {
    parts.push(<span key="tail">{text.slice(pos)}</span>);
  }

  return (
    <span data-sentence-id={sentence.id}>
      {parts}
    </span>
  );
}

// ── 메인 컴포넌트 ──

export function StructuredDocumentView({
  nodeId,
  annotations,
  activeTool,
  activeColor,
  searchQuery,
  onTextSelection,
  onAnnotationClick,
  onEmpty,
}: StructuredDocumentViewProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // sections/sentences 로드
  useEffect(() => {
    if (!nodeId) return;
    setLoading(true);
    setError(false);

    fetch(`/api/nodes/${nodeId}/content`)
      .then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(data => {
        setSections(data.sections ?? []);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [nodeId]);

  // 어노테이션 맵
  const annotationMap = useMemo(() => buildAnnotationMap(annotations), [annotations]);

  // 텍스트 선택 핸들러
  const handleMouseUp = useCallback(() => {
    if (!activeTool || activeTool === 'bookmark') return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const info = resolveSelectionToSentences(selection);
    if (info) {
      onTextSelection(info);
      selection.removeAllRanges();
    }
  }, [activeTool, onTextSelection]);

  // 전체 문장 수
  const totalSentences = useMemo(
    () => sections.reduce((sum, s) => sum + s.sentences.length, 0),
    [sections]
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
        <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-sm)' }}>불러오는 중...</span>
        <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>문서 구조를 불러오는 중...</span>
      </div>
    );
  }

  // sections 없으면 폴백 모드로 전환
  useEffect(() => {
    if (!loading && (error || sections.length === 0)) {
      onEmpty?.();
    }
  }, [loading, error, sections.length, onEmpty]);

  if (error || sections.length === 0) {
    return null;
  }

  return (
    <div style={{ height: 500, overflow: 'auto' }}>
      <div
        ref={containerRef}
        data-document-container
        onMouseUp={handleMouseUp}
        style={{
          cursor: activeTool ? 'text' : 'default',
          userSelect: activeTool ? 'text' : 'auto',
        }}
      >
        {sections.map((section, sIdx) => (
          <div
            key={section.id}
            data-section-id={section.id}
            style={{
              maxWidth: 680,
              margin: '0 auto',
              padding: '32px 40px',
              background: 'var(--mantine-color-body)',
              border: '0.5px solid var(--mantine-color-default-border)',
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            {section.heading && (
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 'var(--mantine-font-size-md)',
                  display: 'block',
                  marginBottom: 8,
                  lineHeight: 1.6,
                }}
              >
                {section.heading}
              </span>
            )}
            <span
              style={{
                fontSize: 'var(--mantine-font-size-sm)',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
              }}
            >
              {section.sentences.map((sentence, idx) => (
                <SentenceSpan
                  key={sentence.id}
                  sentence={sentence}
                  annotationEntries={annotationMap[sentence.id]}
                  searchQuery={searchQuery}
                  onAnnotationClick={onAnnotationClick}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
