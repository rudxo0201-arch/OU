// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Sigma from 'sigma';
import type { NodeDisplayData, EdgeDisplayData } from 'sigma/types';
import { EdgeLineProgram } from 'sigma/rendering';
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker';
import { useGraphData } from '@/lib/graph/use-graph-data';
import GravityNodeProgram from '@/lib/graph/gravity-node-program';
import { FA2_SETTINGS, FA2_RUN_DURATION_MS } from '@/lib/graph/graph-constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
}

interface CardData {
  nodeId: string;
  title: string;
  domain: string;
  tag: string;
  degree: number;
  confidence: string;
  raw: string | null;
  sections: Section[] | null;
  triples: Triple[] | null;
  relations: Relation[] | null;
}

interface Section {
  id: string;
  heading: string | null;
  sentences: { id: string; text: string }[];
}

interface Triple {
  id: string;
  subject: string;
  predicate: string;
  object: string;
}

interface Relation {
  id: string;
  raw: string | null;
  domain: string;
  predicate?: string;
}

type DateFilter = 'all' | '1d' | '1w' | '1m';

// ─── Component ────────────────────────────────────────────────────────────────

export function UniverseView({ visible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const fa2Ref = useRef<FA2LayoutSupervisor | null>(null);
  const fa2TimerRef = useRef<NodeJS.Timeout | null>(null);
  const gravityProgramRef = useRef<GravityNodeProgram | null>(null);
  const isDraggingRef = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { graph, isLoading, error, allDomains, refresh } = useGraphData();

  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; label: string; domain: string }[]>([]);
  const [domainFilter, setDomainFilter] = useState<Set<string>>(new Set());
  const [confidenceFilter, setConfidenceFilter] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [isDark, setIsDark] = useState(false);
  const [localViewMode, setLocalViewMode] = useState(false);

  // ─── Dark mode detection ─────────────────────────────────────────────────
  useEffect(() => {
    const checkDark = () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      setIsDark(dark);
    };
    checkDark();
    const obs = new MutationObserver(checkDark);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // ─── Sigma initialization ─────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !graph || !containerRef.current) return;

    const container = containerRef.current;
    const dark = document.documentElement.dataset.theme === 'dark';

    // Cleanup previous instance
    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }
    if (fa2Ref.current) {
      fa2Ref.current.kill();
      fa2Ref.current = null;
    }
    if (fa2TimerRef.current) {
      clearTimeout(fa2TimerRef.current);
      fa2TimerRef.current = null;
    }

    // Init Sigma
    const sigma = new Sigma(graph, container, {
      nodeProgramClasses: { circle: GravityNodeProgram },
      edgeProgramClasses: { line: EdgeLineProgram },
      defaultNodeType: 'circle',
      defaultEdgeType: 'line',
      defaultEdgeColor: `rgba(100,116,139,${dark ? '0.15' : '0.10'})`,
      labelFont: 'var(--ou-font-body, system-ui)',
      labelSize: 11,
      labelWeight: '400',
      labelColor: { color: dark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.42)' },
      labelRenderedSizeThreshold: 6,
      labelDensity: 0.8,
      renderLabels: true,
      renderEdgeLabels: false,
      hideEdgesOnMove: true,
      hideLabelsOnMove: false,
      minEdgeThickness: 0.5,
      autoRescale: true,
      autoCenter: true,
    });

    sigmaRef.current = sigma;

    // Store gravity program reference for dark mode toggling
    // Retrieve after initialization by accessing internal state
    // (dark mode handled via setDarkMode on re-render)

    // ── FA2 Layout ──────────────────────────────────────────────────────────
    const fa2 = new FA2LayoutSupervisor(graph, {
      settings: FA2_SETTINGS,
      getEdgeWeight: 'weight',
    });
    fa2Ref.current = fa2;
    fa2.start();

    // Stop FA2 after convergence period
    fa2TimerRef.current = setTimeout(() => {
      if (fa2Ref.current?.isRunning()) fa2Ref.current.stop();
    }, FA2_RUN_DURATION_MS);

    // ── Semantic zoom: dynamic label threshold based on camera ratio ────────
    const updateLabelThreshold = () => {
      const ratio = sigma.getCamera().ratio;
      let threshold: number;
      if (ratio >= 1.0) threshold = 14;
      else if (ratio >= 0.6) threshold = 9;
      else if (ratio >= 0.35) threshold = 5;
      else threshold = 2;
      sigma.setSetting('labelRenderedSizeThreshold', threshold);
    };
    sigma.getCamera().on('updated', updateLabelThreshold);
    updateLabelThreshold();

    // ── Node click → selection + info card ─────────────────────────────────
    sigma.on('clickNode', ({ node, preventSigmaDefault }) => {
      preventSigmaDefault();
      selectNode(node);
    });

    // ── Stage click → deselect ──────────────────────────────────────────────
    sigma.on('clickStage', () => {
      deselectNode();
    });

    // ── Hover effects ───────────────────────────────────────────────────────
    sigma.on('enterNode', ({ node }) => {
      graph.setNodeAttribute(node, '_hovered', true);
      sigma.refresh({ partialGraph: { nodes: [node] } });
    });
    sigma.on('leaveNode', ({ node }) => {
      graph.setNodeAttribute(node, '_hovered', false);
      sigma.refresh({ partialGraph: { nodes: [node] } });
    });

    // ── Node drag ───────────────────────────────────────────────────────────
    sigma.on('downNode', ({ node, preventSigmaDefault }) => {
      preventSigmaDefault();
      isDraggingRef.current = node;
      // Pause FA2 during drag for responsive feedback
      if (fa2Ref.current?.isRunning()) fa2Ref.current.stop();
    });

    sigma.getMouseCaptor().on('mousemove', (e) => {
      const dragNode = isDraggingRef.current;
      if (!dragNode) return;
      const graphCoords = sigma.viewportToGraph({ x: e.x, y: e.y });
      graph.setNodeAttribute(dragNode, 'x', graphCoords.x);
      graph.setNodeAttribute(dragNode, 'y', graphCoords.y);
    });

    sigma.getMouseCaptor().on('mouseup', () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = null;
        // Restart FA2 to let it settle from new position
        if (!fa2Ref.current?.isRunning()) {
          fa2Ref.current?.start();
          if (fa2TimerRef.current) clearTimeout(fa2TimerRef.current);
          fa2TimerRef.current = setTimeout(() => {
            if (fa2Ref.current?.isRunning()) fa2Ref.current.stop();
          }, 3000);
        }
      }
    });

    return () => {
      if (fa2TimerRef.current) clearTimeout(fa2TimerRef.current);
      fa2Ref.current?.kill();
      fa2Ref.current = null;
      sigma.kill();
      sigmaRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, graph]);

  // ─── Node reducer (selection + filters) ─────────────────────────────────
  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;

    const selectedId = selectedCard?.nodeId ?? null;
    const neighborSet = selectedId
      ? new Set(graph?.neighbors(selectedId) ?? [])
      : null;

    const dateThreshold = getDateThreshold(dateFilter);

    sigma.setSetting('nodeReducer', (node: string, data: Partial<NodeDisplayData>) => {
      const attrs = graph?.getNodeAttributes(node) ?? {};

      // Local view mode: only show selected node + neighbors
      if (localViewMode && selectedId) {
        if (node !== selectedId && !neighborSet?.has(node)) {
          return { ...data, hidden: true };
        }
      }

      // Filter check
      const domainOk = domainFilter.size === 0 || domainFilter.has(attrs.domain ?? '');
      const confOk = confidenceFilter.size === 0 || confidenceFilter.has(attrs.confidence ?? '');
      const dateOk = !dateThreshold || new Date(attrs.createdAt ?? 0).getTime() >= dateThreshold;

      if (!domainOk || !confOk || !dateOk) {
        return { ...data, hidden: true };
      }

      // Selection highlighting
      if (selectedId) {
        if (node === selectedId) {
          return { ...data, highlighted: true, size: (data.size ?? 4) * 1.4 };
        }
        if (neighborSet?.has(node)) {
          return { ...data };
        }
        if (!localViewMode) {
          return { ...data, color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' };
        }
      }

      return data;
    });

    sigma.setSetting('edgeReducer', (edge: string, data: Partial<EdgeDisplayData>) => {
      if (!selectedId) return data;
      const src = graph?.source(edge);
      const tgt = graph?.target(edge);
      if (src === selectedId || tgt === selectedId) return data;
      return { ...data, hidden: true };
    });

    sigma.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCard?.nodeId, domainFilter, confidenceFilter, dateFilter, isDark, graph, localViewMode]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        deselectNode();
        setSearchQuery('');
        setSearchResults([]);
        searchInputRef.current?.blur();
      }
      if (e.key === 'r' || e.key === 'R') {
        sigmaRef.current?.getCamera().animatedReset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const selectNode = useCallback((nodeId: string) => {
    if (!graph) return;
    const attrs = graph.getNodeAttributes(nodeId);
    setSelectedCard({
      nodeId,
      title: attrs.label ?? nodeId.slice(0, 8),
      domain: attrs.domain ?? 'unknown',
      tag: `#${attrs.domain ?? 'concept'}`,
      degree: attrs.degree ?? 0,
      confidence: attrs.confidence ?? 'medium',
      raw: attrs.raw ?? null,
      sections: null,
      triples: null,
      relations: null,
    });

    // Animate camera to node
    const sigma = sigmaRef.current;
    if (sigma) {
      const nodeData = sigma.getNodeDisplayData(nodeId);
      if (nodeData) {
        sigma.getCamera().animate(
          { x: nodeData.x, y: nodeData.y, ratio: 0.4 },
          { duration: 600, easing: 'quadraticInOut' }
        );
      }
    }

    // Fetch detail data
    Promise.all([
      fetch(`/api/nodes/${nodeId}/content`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/nodes/${nodeId}/triples`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/nodes/${nodeId}/relations`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([contentData, triplesData, relData]) => {
      setSelectedCard(prev => {
        if (!prev || prev.nodeId !== nodeId) return prev;
        return {
          ...prev,
          sections: contentData?.sections ?? null,
          triples: triplesData?.triples ?? null,
          relations: relData?.relations ?? null,
        };
      });
    });
  }, [graph]);

  const deselectNode = useCallback(() => {
    setSelectedCard(null);
    setLocalViewMode(false);
  }, []);

  const enterLocalView = useCallback(() => {
    if (!selectedCard || !graph) return;
    setLocalViewMode(true);

    // Fit camera to the local subgraph (selected + neighbors)
    const sigma = sigmaRef.current;
    if (!sigma) return;
    const nodeIds = [selectedCard.nodeId, ...graph.neighbors(selectedCard.nodeId)];
    const positions = nodeIds
      .map(id => sigma.getNodeDisplayData(id))
      .filter(Boolean) as { x: number; y: number }[];
    if (positions.length === 0) return;

    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const span = Math.max(spanX, spanY, 0.01);
    const ratio = Math.min(0.6, span * 0.9);

    sigma.getCamera().animate({ x: cx, y: cy, ratio }, { duration: 700, easing: 'quadraticInOut' });
  }, [selectedCard, graph]);

  const navigateToNode = useCallback((nodeId: string) => {
    selectNode(nodeId);
  }, [selectNode]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (!q.trim() || !graph) { setSearchResults([]); return; }
    const lower = q.trim().toLowerCase();
    const parts = lower.split(/\s+/);
    const results: { id: string; label: string; domain: string }[] = [];
    graph.forEachNode((node, attrs) => {
      if (results.length >= 10) return;
      const label = (attrs.label ?? '').toLowerCase();
      const domain = (attrs.domain ?? '').toLowerCase();
      const match = parts.every(p => label.includes(p) || domain.includes(p));
      if (match) results.push({ id: node, label: attrs.label ?? node.slice(0, 8), domain: attrs.domain ?? '' });
    });
    setSearchResults(results);
  }, [graph]);

  const selectSearchResult = useCallback((nodeId: string) => {
    setSearchQuery('');
    setSearchResults([]);
    selectNode(nodeId);
  }, [selectNode]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!visible) return null;

  const bg = isDark ? 'var(--ou-bg)' : 'var(--ou-bg)';
  const textPrimary = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.88)';
  const textSecondary = isDark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.48)';
  const textMuted = isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.32)';
  const borderMuted = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
  const borderSubtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const surfaceSubtle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)';
  const surfaceHover = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)';

  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden' }}>
      {/* Sigma canvas container */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Loading */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: textMuted, animation: 'blink 1s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <span style={{ fontSize: 13, color: textMuted }}>데이터를 불러올 수 없습니다</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && graph && graph.order === 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <span style={{ fontSize: 13, color: textMuted }}>대화를 시작하면 별이 생깁니다</span>
        </div>
      )}

      {/* ── Control Panel ──────────────────────────────────────────────── */}
      {graph && graph.order > 0 && (
        <div style={{
          position: 'absolute', top: 20, left: 20,
          background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(16px) saturate(180%)',
          border: `1px solid ${borderMuted}`,
          borderRadius: 14,
          padding: 16, width: 220, zIndex: 100,
          maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
          boxShadow: isDark
            ? '6px 6px 12px rgba(0,0,0,0.55), -6px -6px 12px rgba(255,255,255,0.04)'
            : '6px 6px 12px rgba(163,177,198,0.6), -6px -6px 12px rgba(255,255,255,0.6)',
        }}>
          {/* Header */}
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
            color: textMuted, marginBottom: 12, paddingBottom: 10,
            borderBottom: `1px solid ${borderSubtle}`,
          }}>
            UNIVERSE
          </div>

          {/* Search */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="검색... ( / )"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchResults.length > 0) {
                  selectSearchResult(searchResults[0].id);
                }
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  setSearchResults([]);
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: '100%', padding: '7px 10px',
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${borderMuted}`,
                borderRadius: 8, color: textPrimary, fontSize: 12,
                outline: 'none', boxSizing: 'border-box',
                boxShadow: `inset 2px 2px 5px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(163,177,198,0.4)'}, inset -2px -2px 5px ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)'}`,
              }}
            />
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: isDark ? 'rgba(20,20,28,0.95)' : 'rgba(232,236,241,0.97)',
                border: `1px solid ${borderMuted}`,
                borderRadius: 8, overflow: 'hidden', zIndex: 200,
                boxShadow: isDark
                  ? '0 4px 16px rgba(0,0,0,0.5)'
                  : '0 4px 16px rgba(163,177,198,0.4)',
              }}>
                {searchResults.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => selectSearchResult(r.id)}
                    style={{
                      display: 'block', width: '100%', padding: '7px 10px',
                      background: i === 0 ? surfaceSubtle : 'transparent',
                      border: 'none', color: textPrimary, fontSize: 11,
                      textAlign: 'left', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = surfaceHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i === 0 ? surfaceSubtle : 'transparent'; }}
                  >
                    <span>{r.label}</span>
                    <span style={{ float: 'right', fontSize: 9, color: textMuted }}>{r.domain}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset button */}
          <button
            onClick={() => {
              sigmaRef.current?.getCamera().animatedReset();
              deselectNode();
            }}
            style={{
              width: '100%', padding: '7px 0', marginBottom: 14,
              background: 'transparent', color: textMuted,
              border: `1px solid ${borderSubtle}`, borderRadius: 8,
              fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = textSecondary; e.currentTarget.style.borderColor = borderMuted; }}
            onMouseLeave={e => { e.currentTarget.style.color = textMuted; e.currentTarget.style.borderColor = borderSubtle; }}
          >
            초기화 (R)
          </button>

          {/* Domain filter */}
          {allDomains.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                도메인
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {allDomains.map(d => {
                  const active = domainFilter.has(d);
                  return (
                    <button
                      key={d}
                      onClick={() => setDomainFilter(prev => {
                        const next = new Set(prev);
                        if (next.has(d)) next.delete(d); else next.add(d);
                        return next;
                      })}
                      style={{
                        padding: '2px 7px', fontSize: 9, borderRadius: 20, cursor: 'pointer',
                        background: active ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)') : surfaceSubtle,
                        color: active ? textPrimary : textMuted,
                        border: `1px solid ${active ? borderMuted : borderSubtle}`,
                        transition: 'all 0.12s',
                      }}
                    >{d}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confidence filter */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>신뢰도</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['high', 'medium', 'low'] as const).map(c => {
                const active = confidenceFilter.has(c);
                return (
                  <button key={c}
                    onClick={() => setConfidenceFilter(prev => {
                      const next = new Set(prev);
                      if (next.has(c)) next.delete(c); else next.add(c);
                      return next;
                    })}
                    style={{
                      flex: 1, padding: '4px 0', fontSize: 9, borderRadius: 6, cursor: 'pointer',
                      background: active ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)') : surfaceSubtle,
                      color: active ? textPrimary : textMuted,
                      border: `1px solid ${active ? borderMuted : borderSubtle}`,
                      transition: 'all 0.12s',
                    }}
                  >{c}</button>
                );
              })}
            </div>
          </div>

          {/* Date filter */}
          <div>
            <div style={{ fontSize: 9, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>기간</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {([['all', '전체'], ['1d', '1일'], ['1w', '1주'], ['1m', '1달']] as const).map(([val, label]) => (
                <button key={val}
                  onClick={() => setDateFilter(val)}
                  style={{
                    flex: 1, padding: '4px 0', fontSize: 9, borderRadius: 6, cursor: 'pointer',
                    background: dateFilter === val ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)') : surfaceSubtle,
                    color: dateFilter === val ? textPrimary : textMuted,
                    border: `1px solid ${dateFilter === val ? borderMuted : borderSubtle}`,
                    transition: 'all 0.12s',
                  }}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Info Card Panel ────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 20, right: selectedCard ? 20 : -400,
        width: 340, maxHeight: 'calc(100vh - 80px)',
        background: isDark ? 'rgba(20,20,28,0.92)' : 'rgba(232,236,241,0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${borderMuted}`,
        borderRadius: 16, overflow: 'hidden',
        boxShadow: isDark
          ? '-5px 10px 30px rgba(0,0,0,0.5)'
          : '-5px 10px 30px rgba(163,177,198,0.4)',
        transition: 'right 0.4s cubic-bezier(0.2,0.8,0.2,1)', zIndex: 200,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Card Header */}
        <div style={{
          padding: '18px 18px 0', flexShrink: 0,
          position: 'sticky', top: 0,
          background: isDark ? 'rgba(20,20,28,0.92)' : 'rgba(232,236,241,0.95)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: textPrimary }}>
              {selectedCard?.title}
            </h2>
            <button
              onClick={deselectNode}
              style={{
                background: 'none', border: 'none', color: textMuted,
                fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0, marginLeft: 12,
              }}
            >&times;</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 20,
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              color: textSecondary, fontSize: 10, fontWeight: 600,
            }}>
              {selectedCard?.tag}
            </span>
            <span style={{ fontSize: 10, color: textMuted, lineHeight: '20px' }}>
              연결 {selectedCard?.degree} · {selectedCard?.confidence}
            </span>
          </div>
          {!localViewMode ? (
            <button
              onClick={enterLocalView}
              style={{
                width: '100%', padding: '6px 0', marginBottom: 12,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${borderMuted}`,
                borderRadius: 8, color: textSecondary, fontSize: 11,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; }}
            >
              이 별들만 모아보기 ✦
            </button>
          ) : (
            <button
              onClick={() => setLocalViewMode(false)}
              style={{
                width: '100%', padding: '6px 0', marginBottom: 12,
                background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                border: `1px solid ${borderMuted}`,
                borderRadius: 8, color: textPrimary, fontSize: 11,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'; }}
            >
              ← 전체 보기
            </button>
          )}
          <div style={{ height: 1, background: borderSubtle, marginBottom: 14 }} />
        </div>

        {/* Card Body */}
        <div style={{ padding: '0 18px 18px', overflowY: 'auto' }}>
          {/* Raw */}
          {selectedCard?.raw && (
            <CardSection label="원본">
              <p style={{ margin: 0, fontSize: 12, color: textSecondary, lineHeight: 1.6 }}>
                {selectedCard.raw.slice(0, 200)}{selectedCard.raw.length > 200 ? '…' : ''}
              </p>
            </CardSection>
          )}

          {/* Triples */}
          {selectedCard?.triples && selectedCard.triples.length > 0 && (
            <CardSection label="트리플">
              {selectedCard.triples.slice(0, 8).map(t => (
                <div key={t.id} style={{ fontSize: 11, color: textSecondary, lineHeight: 1.9, display: 'flex', gap: 5 }}>
                  <span style={{ color: textPrimary }}>{t.subject}</span>
                  <span style={{ color: textMuted, fontSize: 9 }}>{t.predicate}</span>
                  <span style={{ color: textSecondary }}>{t.object}</span>
                </div>
              ))}
            </CardSection>
          )}

          {/* Sections */}
          {selectedCard?.sections && selectedCard.sections.length > 0 && (
            <CardSection label="섹션">
              {selectedCard.sections.slice(0, 5).map(sec => (
                <div key={sec.id} style={{ marginBottom: 8 }}>
                  {sec.heading && (
                    <div style={{ fontSize: 11, color: textSecondary, fontWeight: 600, marginBottom: 2 }}>
                      {sec.heading}
                    </div>
                  )}
                  {sec.sentences.slice(0, 3).map(s => (
                    <div key={s.id} style={{ fontSize: 11, color: textMuted, lineHeight: 1.6 }}>{s.text}</div>
                  ))}
                  {sec.sentences.length > 3 && (
                    <div style={{ fontSize: 10, color: textMuted, opacity: 0.6 }}>+{sec.sentences.length - 3}문장</div>
                  )}
                </div>
              ))}
            </CardSection>
          )}

          {/* Relations */}
          {selectedCard?.relations && selectedCard.relations.length > 0 && (
            <CardSection label="연결 노드">
              {selectedCard.relations.slice(0, 8).map(rel => (
                <button
                  key={rel.id}
                  onClick={() => navigateToNode(rel.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 8px', marginBottom: 3,
                    background: surfaceSubtle, border: `1px solid ${borderSubtle}`,
                    borderRadius: 8, cursor: 'pointer', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = surfaceHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = surfaceSubtle; }}
                >
                  <div style={{ fontSize: 11, color: textSecondary, lineHeight: 1.4 }}>
                    {rel.raw ? (rel.raw.length > 40 ? rel.raw.slice(0, 40) + '…' : rel.raw) : rel.id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 9, color: textMuted, marginTop: 2 }}>
                    {rel.predicate && <span>{rel.predicate} · </span>}{rel.domain}
                  </div>
                </button>
              ))}
            </CardSection>
          )}

          {/* Loading detail data */}
          {selectedCard && selectedCard.triples === null && selectedCard.sections === null && (
            <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: textMuted }}>
              불러오는 중...
            </div>
          )}

          {/* Footer */}
          <div style={{
            borderTop: `1px solid ${borderSubtle}`, paddingTop: 10, marginTop: 8,
            display: 'flex', justifyContent: 'space-between',
            fontSize: 9, color: textMuted,
          }}>
            <span>{selectedCard?.domain}</span>
            <span style={{ fontFamily: 'monospace' }}>{selectedCard?.nodeId?.slice(0, 8)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CardSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
        color: 'var(--ou-text-muted, rgba(0,0,0,0.32))',
        marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateThreshold(filter: DateFilter): number | null {
  const now = Date.now();
  switch (filter) {
    case '1d': return now - 86400_000;
    case '1w': return now - 7 * 86400_000;
    case '1m': return now - 30 * 86400_000;
    default: return null;
  }
}
