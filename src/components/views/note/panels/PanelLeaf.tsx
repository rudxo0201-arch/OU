'use client';
import { DOMAINS } from '@/lib/ou-registry';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  SquaresFour, FilePdf, Graph,
  SplitHorizontal, SplitVertical, X, CaretDown,
} from '@phosphor-icons/react';
import React from 'react';
import { NotePanel } from './NotePanel';
import { PDFReader } from './PDFReader';
import type { LeafPanel, PanelContent } from './types';

import { NodeDetailCard } from '@/components/graph/NodeDetailCard';

const GraphView = dynamic(
  () => import('@/components/graph/GraphView').then(m => m.GraphView),
  { ssr: false },
);

// ── 타입별 메타데이터 ────────────────────────────────────────

const KIND_META: Record<string, { label: string; icon: React.ReactNode }> = {
  note:  { label: '노트',  icon: <span style={{ fontSize: 11 }}>✎</span> },
  pdf:   { label: 'PDF',   icon: <FilePdf size={12} /> },
  graph: { label: '그래프', icon: <Graph size={12} /> },
  empty: { label: '비어 있음', icon: <SquaresFour size={12} /> },
};

interface Props {
  panel: LeafPanel;
  focused: boolean;
  canClose: boolean;
  onFocus: () => void;
  onSplit: (dir: 'h' | 'v') => void;
  onClose: () => void;
  onContent: (c: PanelContent) => void;
}

export function PanelLeaf({ panel, focused, canClose, onFocus, onSplit, onClose, onContent }: Props) {
  const { content } = panel;
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  // 노트 제목 표시를 위해 별도 상태로 관리
  const [noteTitle, setNoteTitle] = useState<string>('');

  const meta = KIND_META[content.kind] ?? KIND_META.empty;

  const changeType = (kind: PanelContent['kind']) => {
    setShowTypeMenu(false);
    if (kind === content.kind) return;
    if (kind === DOMAINS.NOTE)  onContent({ kind: 'note' });
    if (kind === 'pdf')   onContent({ kind: 'pdf' });
    if (kind === 'graph') onContent({ kind: 'graph' });
    if (kind === 'empty') onContent({ kind: 'empty' });
  };

  return (
    <div
      onClick={onFocus}
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden',
        borderLeft: focused ? '2px solid #4DA6FF44' : '2px solid transparent',
        transition: 'border-color 200ms',
      }}
    >
      {/* ── 패널 헤더 ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '0 6px', height: 32, flexShrink: 0,
        background: 'var(--ou-glass-elevated)',
        borderBottom: '1px solid var(--ou-glass-border)',
        backdropFilter: 'var(--ou-blur)',
        userSelect: 'none',
      }}>
        {/* 타입 뱃지 (클릭 시 드롭다운) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowTypeMenu(v => !v); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 7px', fontSize: 11,
              background: 'var(--ou-glass)', border: '1px solid var(--ou-glass-border)',
              borderRadius: 'var(--ou-radius-sm)', cursor: 'pointer',
              color: 'var(--ou-text-muted)',
            }}
          >
            {meta.icon}
            {meta.label}
            <CaretDown size={9} />
          </button>

          {showTypeMenu && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                onClick={() => setShowTypeMenu(false)}
              />
              <div style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 101,
                marginTop: 4, minWidth: 120,
                background: 'var(--ou-glass-elevated)',
                border: '1px solid var(--ou-glass-border)',
                borderRadius: 'var(--ou-radius-sm)',
                boxShadow: 'var(--ou-shadow-md)',
                backdropFilter: 'var(--ou-blur)',
                overflow: 'hidden',
              }}>
                {(['note', 'pdf', 'graph', 'empty'] as const).map(k => (
                  <button
                    key={k}
                    onClick={e => { e.stopPropagation(); changeType(k); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '7px 12px', fontSize: 12,
                      background: content.kind === k ? 'var(--ou-glass-active)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      color: 'var(--ou-text-body)', textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (content.kind !== k) (e.currentTarget as HTMLElement).style.background = 'var(--ou-glass)'; }}
                    onMouseLeave={e => { if (content.kind !== k) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {KIND_META[k].icon}
                    {KIND_META[k].label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 노트 제목 */}
        {content.kind === DOMAINS.NOTE && content.noteId && (
          <span style={{
            flex: 1, fontSize: 12, color: 'var(--ou-text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {noteTitle || '...'}
          </span>
        )}
        {!(content.kind === DOMAINS.NOTE && content.noteId) && (
          <span style={{ flex: 1 }} />
        )}

        {/* 액션 버튼들 */}
        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <HeaderBtn title="수평 분할 (좌/우)" onClick={() => onSplit('h')}>
            <SplitHorizontal size={12} />
          </HeaderBtn>
          <HeaderBtn title="수직 분할 (위/아래)" onClick={() => onSplit('v')}>
            <SplitVertical size={12} />
          </HeaderBtn>
          {canClose && (
            <HeaderBtn title="패널 닫기" onClick={onClose} danger>
              <X size={12} />
            </HeaderBtn>
          )}
        </div>
      </div>

      {/* ── 패널 콘텐츠 ──────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, position: 'relative' }}>
        {content.kind === DOMAINS.NOTE && (
          <NoteTitle noteId={content.noteId} onTitle={setNoteTitle}>
            <NotePanel noteId={content.noteId} />
          </NoteTitle>
        )}
        {content.kind === 'pdf' && (
          <PDFReader
            url={content.url}
            fileName={content.fileName}
            onUrlChange={(url, name) => onContent({ kind: 'pdf', url, fileName: name })}
          />
        )}
        {content.kind === 'graph' && (
          <div style={{ width: '100%', height: '100%' }}>
            <NoteGraphPanel />
          </div>
        )}
        {content.kind === 'empty' && (
          <EmptyPanel onContent={onContent} />
        )}
      </div>
    </div>
  );
}

// ── 그래프 패널 (/api/graph 전체 — 모든 Item이 노드, 도메인 필터 없음) ─

type GraphItem = { id: string; domain: string; raw?: string };
type GraphLink = { source: string; target: string; weight?: number };

function NoteGraphPanel() {
  const [data, setData] = useState<{ nodes: GraphItem[]; links: GraphLink[] } | null>(null);
  const rawNodesRef = useRef<Map<string, Record<string, unknown>>>(new Map());
  const [selectedNode, setSelectedNode] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/graph')
      .then(r => (r.ok ? r.json() : { nodes: [], edges: [] }))
      .then(json => {
        if (cancelled) return;
        const rawMap = new Map<string, Record<string, unknown>>();
        const nodes: GraphItem[] = (json.nodes ?? []).map(
          (n: Record<string, unknown>) => {
            rawMap.set(n.id as string, n);
            return {
              id: n.id as string,
              domain: (n.domain as string) ?? '',
              raw: (n.label as string) ?? (n.raw as string) ?? '',
            };
          }
        );
        rawNodesRef.current = rawMap;
        const links: GraphLink[] = (json.edges ?? []).map(
          (e: { source: string; target: string; weight?: number }) => ({
            source: e.source, target: e.target, weight: e.weight,
          })
        );
        setData({ nodes, links });
      })
      .catch(() => { if (!cancelled) setData({ nodes: [], links: [] }); });
    return () => { cancelled = true; };
  }, []);

  const handleNodeClick = useCallback((node: { id: string }) => {
    const raw = rawNodesRef.current.get(node.id);
    if (raw) setSelectedNode(raw);
  }, []);

  if (!data) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ou-text-disabled)', fontSize: 13,
      }}>
        그래프 로딩 중...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GraphView nodes={data.nodes} links={data.links} onNodeClick={handleNodeClick} />
      {selectedNode && (
        <NodeDetailCard
          node={selectedNode as Parameters<typeof NodeDetailCard>[0]['node']}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

// ── 노트 제목 추출 (fetches metadata) ────────────────────────

function NoteTitle({ noteId, onTitle, children }: {
  noteId?: string;
  onTitle: (title: string) => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!noteId) return;
    fetch(`/api/notes/${noteId}`)
      .then(r => r.json())
      .then(d => {
        const title = (d.note?.domain_data as Record<string, unknown>)?.title as string;
        if (title) onTitle(title);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);
  return <>{children}</>;
}

// ── 빈 패널 ──────────────────────────────────────────────────

function EmptyPanel({ onContent }: { onContent: (c: PanelContent) => void }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      color: 'var(--ou-text-disabled)', padding: 32,
    }}>
      <SquaresFour size={40} style={{ opacity: 0.15 }} />
      <div style={{ fontSize: 13, color: 'var(--ou-text-disabled)' }}>
        패널 유형을 선택하세요
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {([
          { kind: 'note' as const,  icon: '✎',  label: '노트'  },
          { kind: 'pdf'  as const,  icon: '📄', label: 'PDF'   },
          { kind: 'graph' as const, icon: '◎',  label: '그래프' },
        ]).map(({ kind, icon, label }) => (
          <button
            key={kind}
            onClick={() => onContent({ kind })}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '16px 20px',
              background: 'var(--ou-glass)',
              border: '1px solid var(--ou-glass-border)',
              borderRadius: 'var(--ou-radius-md)',
              cursor: 'pointer', fontSize: 11, color: 'var(--ou-text-muted)',
              transition: 'all 150ms', minWidth: 72,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--ou-glass-hover)';
              (e.currentTarget as HTMLElement).style.color = 'var(--ou-text-body)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--ou-glass)';
              (e.currentTarget as HTMLElement).style.color = 'var(--ou-text-muted)';
            }}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 헤더 버튼 ─────────────────────────────────────────────────

function HeaderBtn({ children, title, onClick, danger }: {
  children: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick(e); }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: 4,
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--ou-text-disabled)',
        transition: 'all 100ms',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = danger ? '#ff333322' : 'var(--ou-glass)';
        (e.currentTarget as HTMLElement).style.color = danger ? '#ff3333' : 'var(--ou-text-body)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.color = 'var(--ou-text-disabled)';
      }}
    >
      {children}
    </button>
  );
}
