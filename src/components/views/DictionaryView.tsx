'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MagnifyingGlass, X, ArrowLeft } from '@phosphor-icons/react';
import type { ViewProps } from './registry';
import { useLayoutStyles } from '@/hooks/useLayoutStyles';
import type { LayoutConfig } from '@/types/layout-config';

const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

function extractHanjaChars(text: string): string[] {
  const matches = text.match(CJK_REGEX);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

// Custom debounce hook
function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface Filters {
  radical?: string;
  gradeMin?: number;
  gradeMax?: number;
  strokeMin?: number;
  strokeMax?: number;
  compositionType?: string;
}

function getNodeDomainData(node: any) { return node.domain_data || {}; }

function matchesSearchFn(node: any, query: string, hanjaChars: string[]): boolean {
  const d = getNodeDomainData(node);
  if (!query) return true;
  if (hanjaChars.length > 0) return hanjaChars.includes(d.char);
  const q = query.toLowerCase();
  const ko = (d.readings?.ko || []).join(' ').toLowerCase();
  const hun = (d.readings?.ko_hun || []).join(' ').toLowerCase();
  const hangul = (d.hangul_reading || '').toLowerCase();
  const defEn = (d.definition_en || '').toLowerCase();
  return ko.includes(q) || hun.includes(q) || hangul.includes(q) || defEn.includes(q);
}

function matchesFilters(node: any, filters: Filters): boolean {
  const d = getNodeDomainData(node);
  if (filters.radical && d.radical_char !== filters.radical) return false;
  if (filters.gradeMin != null && (d.grade == null || d.grade < filters.gradeMin)) return false;
  if (filters.gradeMax != null && (d.grade == null || d.grade > filters.gradeMax)) return false;
  if (filters.strokeMin != null && d.stroke_count < filters.strokeMin) return false;
  if (filters.strokeMax != null && d.stroke_count > filters.strokeMax) return false;
  if (filters.compositionType && d.composition?.type !== filters.compositionType) return false;
  return true;
}

function getAvailableFilters(nodes: any[]) {
  const radicals = new Map<string, number>();
  const grades = new Map<number, number>();
  const compositionTypes = new Map<string, number>();
  for (const n of nodes) {
    const d = getNodeDomainData(n);
    if (d.radical_char) radicals.set(d.radical_char, (radicals.get(d.radical_char) || 0) + 1);
    if (d.grade != null) grades.set(d.grade, (grades.get(d.grade) || 0) + 1);
    if (d.composition?.type) compositionTypes.set(d.composition.type, (compositionTypes.get(d.composition.type) || 0) + 1);
  }
  return {
    radicals: Array.from(radicals.entries()).sort((a, b) => b[1] - a[1]),
    grades: Array.from(grades.entries()).sort((a, b) => a[0] - b[0]),
    compositionTypes: Array.from(compositionTypes.entries()).sort((a, b) => b[1] - a[1]),
  };
}

function HanjaCard({ node, onClick, styles }: { node: any; onClick: () => void; styles: ReturnType<typeof useLayoutStyles> }) {
  const d = getNodeDomainData(node);
  const hun = d.readings?.ko_hun?.[0] || '';
  const eum = d.readings?.ko?.[0] || d.hangul_reading || '';
  const displayReading = hun && eum ? `${hun} ${eum}` : eum || hun;

  return (
    <div onClick={onClick} className="hanja-card" style={{ ...styles.card, cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s ease', border: '0.5px solid var(--ou-border, #333)', borderRadius: 8, padding: 12 }}>
      <span style={styles.primary}>{d.char}</span>
      {styles.isFieldVisible('reading') && (
        <span style={{ ...styles.secondary, marginTop: 4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayReading}</span>
      )}
      <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'center', alignItems: 'center' }}>
        {styles.isFieldVisible('stroke') && <span style={styles.tertiary}>{d.stroke_count}획</span>}
        {styles.isFieldVisible('radical') && d.radical_char && <span style={styles.tertiary}>{d.radical_char}부</span>}
        {styles.isFieldVisible('grade') && d.grade != null && (
          <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4 }}>
            {d.grade > 0 ? `${d.grade}급` : '특급'}
          </span>
        )}
      </div>
    </div>
  );
}

function DetailPanel({ node, nodes, onClose, onSelect }: { node: any; nodes: any[]; onClose: () => void; onSelect: (node: any) => void }) {
  const d = getNodeDomainData(node);
  const sameRadical = useMemo(() => nodes.filter(n => { const nd = getNodeDomainData(n); return nd.radical_char === d.radical_char && nd.char !== d.char; }).slice(0, 20), [nodes, d.radical_char, d.char]);
  const sameReading = useMemo(() => { const myReading = d.readings?.ko?.[0]; if (!myReading) return []; return nodes.filter(n => { const nd = getNodeDomainData(n); return nd.readings?.ko?.includes(myReading) && nd.char !== d.char; }).slice(0, 20); }, [nodes, d.readings?.ko, d.char]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 4 }}><ArrowLeft size={18} /></button>
        {d.grade != null && <span style={{ fontSize: 10, padding: '2px 8px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4 }}>{d.grade > 0 ? `${d.grade}급` : '특급'}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{d.char}</span>
        <span style={{ fontSize: 18, fontWeight: 500 }}>{d.readings?.ko_hun?.[0] && `${d.readings.ko_hun[0]} `}{d.readings?.ko?.[0] || d.hangul_reading}</span>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>부수: {d.radical_char} ({d.radical_name_ko}) | 총획: {d.stroke_count}</span>
      </div>

      {d.composition && (
        <div style={{ padding: 12, border: '1px solid var(--ou-border, #333)', borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginBottom: 4 }}>구성 원리</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4 }}>{d.composition.type}</span>
            {d.composition.components?.length > 0 && <span style={{ fontSize: 13 }}>{d.composition.components.join(' + ')}</span>}
          </div>
          {d.composition.explanation && <span style={{ fontSize: 13, display: 'block', marginTop: 4 }}>{d.composition.explanation}</span>}
          {d.composition.mnemonic && <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginTop: 4, fontStyle: 'italic' }}>{d.composition.mnemonic}</span>}
        </div>
      )}

      <div style={{ padding: 12, border: '1px solid var(--ou-border, #333)', borderRadius: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginBottom: 4 }}>읽기</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {d.readings?.ko?.length > 0 && <div style={{ display: 'flex', gap: 8 }}><span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', width: 32 }}>한국</span><span style={{ fontSize: 13 }}>{d.readings.ko.join(', ')}</span></div>}
          {d.readings?.cn_pinyin && <div style={{ display: 'flex', gap: 8 }}><span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', width: 32 }}>중국</span><span style={{ fontSize: 13 }}>{d.readings.cn_pinyin}</span></div>}
          {(d.readings?.jp_on || d.readings?.jp_kun) && <div style={{ display: 'flex', gap: 8 }}><span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', width: 32 }}>일본</span><span style={{ fontSize: 13 }}>{d.readings.jp_on && `${d.readings.jp_on}`}{d.readings.jp_on && d.readings.jp_kun && ' / '}{d.readings.jp_kun && `${d.readings.jp_kun}`}</span></div>}
        </div>
      </div>

      {d.definition_en && (
        <div style={{ padding: 12, border: '1px solid var(--ou-border, #333)', borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginBottom: 4 }}>영문 정의</span>
          <span style={{ fontSize: 13 }}>{d.definition_en}</span>
        </div>
      )}

      {sameRadical.length > 0 && (
        <div>
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginBottom: 4 }}>같은 부수 ({d.radical_char})</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {sameRadical.map(n => (
              <div key={n.id} onClick={() => onSelect(n)} style={{ border: '1px solid var(--ou-border, #333)', borderRadius: 4, cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                {getNodeDomainData(n).char}
              </div>
            ))}
          </div>
        </div>
      )}

      {sameReading.length > 0 && (
        <div>
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginBottom: 4 }}>같은 음 ({d.readings?.ko?.[0]})</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {sameReading.map(n => (
              <div key={n.id} onClick={() => onSelect(n)} style={{ border: '1px solid var(--ou-border, #333)', borderRadius: 4, cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                {getNodeDomainData(n).char}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 100;

interface DictionaryViewProps extends ViewProps {
  onSearch?: (params: { query?: string; radical?: string; grade?: string; strokeMin?: string; strokeMax?: string; compType?: string; page?: number }) => void;
  total?: number;
  loading?: boolean;
}

export function DictionaryView({ nodes, onSearch, total, loading, layoutConfig }: DictionaryViewProps) {
  const styles = useLayoutStyles(layoutConfig);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 200);
  const [filters, setFilters] = useState<Filters>({});
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);

  const isServerMode = !!onSearch;
  const hanjaChars = useMemo(() => extractHanjaChars(debouncedQuery), [debouncedQuery]);

  useEffect(() => {
    if (!isServerMode) return;
    onSearch({ query: debouncedQuery || undefined, radical: filters.radical, grade: filters.gradeMin?.toString(), page });
  }, [debouncedQuery, filters, page, isServerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredNodes = useMemo(() => {
    if (isServerMode) return nodes;
    let result = nodes.filter(n => {
      const d = getNodeDomainData(n);
      if (d.type !== 'hanja') return false;
      if (!matchesSearchFn(n, debouncedQuery, hanjaChars)) return false;
      if (!matchesFilters(n, filters)) return false;
      return true;
    });
    if (hanjaChars.length > 0) {
      const order = new Map(hanjaChars.map((c, i) => [c, i]));
      result.sort((a, b) => (order.get(getNodeDomainData(a).char) ?? 999) - (order.get(getNodeDomainData(b).char) ?? 999));
    }
    return result;
  }, [nodes, debouncedQuery, hanjaChars, filters, isServerMode]);

  const availableFilters = useMemo(() => getAvailableFilters((nodes ?? []).filter(n => getNodeDomainData(n).type === 'hanja')), [nodes]);

  const totalCount = isServerMode ? (total ?? nodes.length) : filteredNodes.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pagedNodes = isServerMode ? filteredNodes : filteredNodes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCardClick = useCallback((node: any) => { setSelectedNode(node); setDrawerOpen(true); }, []);
  const handleFilterChange = useCallback((key: keyof Filters, value: any) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); }, []);
  const clearFilter = useCallback((key: keyof Filters) => { setFilters(prev => { const next = { ...prev }; delete next[key]; return next; }); setPage(1); }, []);
  const handleSearchChange = useCallback((val: string) => { setSearchQuery(val); setPage(1); }, []);

  const gridCols = typeof styles.gridColumns === 'number' ? styles.gridColumns : 6;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <MagnifyingGlass size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ou-text-dimmed, #888)' }} />
        <input
          placeholder="한자, 음, 훈 검색 (문장 붙여넣기 가능)"
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          style={{ width: '100%', padding: '8px 32px 8px 32px', fontSize: 14, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', color: 'inherit', outline: 'none' }}
        />
        {searchQuery && (
          <button onClick={() => handleSearchChange('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {hanjaChars.length > 0 && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>추출된 한자:</span>
          {hanjaChars.map((c, i) => (
            <span key={i} style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4 }}>{c}</span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {availableFilters.radicals.length > 0 && (
          <select value={filters.radical || ''} onChange={e => e.target.value ? handleFilterChange('radical', e.target.value) : clearFilter('radical')}
            style={{ padding: '4px 8px', fontSize: 12, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', color: 'inherit', width: 90 }}>
            <option value="">부수</option>
            {availableFilters.radicals.slice(0, 50).map(([char, count]) => (<option key={char} value={char}>{char} ({count})</option>))}
          </select>
        )}
        {availableFilters.grades.length > 0 && (
          <select value={filters.gradeMin?.toString() || ''} onChange={e => { if (e.target.value) { const g = parseInt(e.target.value); handleFilterChange('gradeMin', g); handleFilterChange('gradeMax', g); } else { clearFilter('gradeMin'); clearFilter('gradeMax'); } }}
            style={{ padding: '4px 8px', fontSize: 12, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', color: 'inherit', width: 90 }}>
            <option value="">급수</option>
            {availableFilters.grades.map(([grade, count]) => (<option key={grade} value={grade.toString()}>{grade > 0 ? `${grade}급` : '특급'} ({count})</option>))}
          </select>
        )}
        {availableFilters.compositionTypes.length > 0 && (
          <select value={filters.compositionType || ''} onChange={e => e.target.value ? handleFilterChange('compositionType', e.target.value) : clearFilter('compositionType')}
            style={{ padding: '4px 8px', fontSize: 12, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', color: 'inherit', width: 100 }}>
            <option value="">구성원리</option>
            {availableFilters.compositionTypes.map(([type, count]) => (<option key={type} value={type}>{type} ({count})</option>))}
          </select>
        )}
      </div>

      {/* Active filter chips */}
      {Object.keys(filters).length > 0 && (
        <div style={{ display: 'flex', gap: 4 }}>
          {filters.radical && <button onClick={() => clearFilter('radical')} style={{ fontSize: 11, padding: '2px 8px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 12, background: 'none', cursor: 'pointer', color: 'inherit' }}>{filters.radical}부 x</button>}
          {filters.gradeMin != null && <button onClick={() => { clearFilter('gradeMin'); clearFilter('gradeMax'); }} style={{ fontSize: 11, padding: '2px 8px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 12, background: 'none', cursor: 'pointer', color: 'inherit' }}>{filters.gradeMin}급 x</button>}
          {filters.compositionType && <button onClick={() => clearFilter('compositionType')} style={{ fontSize: 11, padding: '2px 8px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 12, background: 'none', cursor: 'pointer', color: 'inherit' }}>{filters.compositionType} x</button>}
        </div>
      )}

      {/* Count + loading */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {loading && <div style={{ width: 12, height: 12, border: '2px solid var(--ou-gray-5, #888)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{totalCount.toLocaleString()}자</span>
      </div>

      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: styles.gridGap ?? 8 }}>
        {pagedNodes.map(node => (<HanjaCard key={node.id} node={node} onClick={() => handleCardClick(node)} styles={styles} />))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 12 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: '4px 8px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4, background: 'none', cursor: page <= 1 ? 'default' : 'pointer', color: 'inherit', opacity: page <= 1 ? 0.3 : 1 }}>Prev</button>
          <span style={{ padding: '4px 8px', fontSize: 12 }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ padding: '4px 8px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4, background: 'none', cursor: page >= totalPages ? 'default' : 'pointer', color: 'inherit', opacity: page >= totalPages ? 0.3 : 1 }}>Next</button>
        </div>
      )}

      {/* Detail drawer overlay */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setDrawerOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 380, maxWidth: '90vw', height: '100vh', overflowY: 'auto', background: 'var(--ou-bg, #111)', borderLeft: '0.5px solid var(--ou-border, #333)' }}>
            {selectedNode && (
              <DetailPanel node={selectedNode} nodes={filteredNodes} onClose={() => setDrawerOpen(false)} onSelect={node => setSelectedNode(node)} />
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
