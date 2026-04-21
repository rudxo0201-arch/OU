'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { MagnifyingGlass, X, ArrowLeft } from '@phosphor-icons/react';
import type { ViewProps } from './registry';

const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

function extractHanjaChars(text: string): string[] {
  const matches = text.match(CJK_REGEX);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// 한글 초성 추출
const CHOSEONG = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const CHOSEONG_FULL = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function getChoseong(char: string): string {
  const code = char.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return '';
  const idx = Math.floor((code - 0xAC00) / 28 / 21);
  const full = CHOSEONG_FULL[idx];
  // 쌍자음은 기본 자음으로 매핑
  const map: Record<string, string> = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
  return map[full] || full;
}

const GRADE_ORDER = ['8급','준7급','7급','준6급','6급','준5급','5급','준4급','4급','준3급','3급','2급','준2급','1급','준1급','특급','준특급','사범'];

interface Filters {
  radical?: string;
  grade?: string;
  choseong?: string;
  strokeMin?: number;
  strokeMax?: number;
  charType?: string;
}

function getNodeDomainData(node: any) { return node.domain_data || {}; }

function matchesSearchFn(node: any, query: string, hanjaChars: string[]): boolean {
  const d = getNodeDomainData(node);
  if (!query) return true;
  if (hanjaChars.length > 0) return hanjaChars.includes(d.char);
  const q = query.toLowerCase();
  return (
    (d.sound || '').toLowerCase().includes(q) ||
    (d.hun || '').toLowerCase().includes(q) ||
    (d.meaning || '').toLowerCase().includes(q)
  );
}

function matchesFilters(node: any, filters: Filters): boolean {
  const d = getNodeDomainData(node);
  if (filters.radical && d.radical !== filters.radical) return false;
  if (filters.grade && d.grade !== filters.grade) return false;
  if (filters.choseong) {
    const firstChar = (d.sound || '')[0] || '';
    if (getChoseong(firstChar) !== filters.choseong) return false;
  }
  if (filters.strokeMin != null && (d.stroke_count == null || d.stroke_count < filters.strokeMin)) return false;
  if (filters.strokeMax != null && (d.stroke_count == null || d.stroke_count > filters.strokeMax)) return false;
  if (filters.charType && d.char_type !== filters.charType) return false;
  return true;
}

function getAvailableFilters(nodes: any[]) {
  const radicals = new Map<string, number>();
  const grades = new Map<string, number>();
  for (const n of nodes) {
    const d = getNodeDomainData(n);
    if (d.radical) radicals.set(d.radical, (radicals.get(d.radical) || 0) + 1);
    if (d.grade) grades.set(d.grade, (grades.get(d.grade) || 0) + 1);
  }
  return {
    radicals: Array.from(radicals.entries()).sort((a, b) => b[1] - a[1]),
    grades: Array.from(grades.entries()).sort((a, b) => {
      const ai = GRADE_ORDER.indexOf(a[0]);
      const bi = GRADE_ORDER.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }),
  };
}

const CJK_FONT = '"PingFang SC", "Apple SD Gothic Neo", "Noto Serif KR", "Source Han Serif K", "Microsoft YaHei", "Noto Sans CJK KR", serif';

const chipBase: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 999,
  fontSize: 11,
  border: '0.5px solid var(--ou-border-subtle)',
  background: 'none',
  cursor: 'pointer',
  color: 'inherit',
  whiteSpace: 'nowrap' as const,
};

const chipActive: React.CSSProperties = {
  ...chipBase,
  background: 'var(--ou-text-heading)',
  color: 'var(--ou-bg)',
  borderColor: 'var(--ou-text-heading)',
};

function HanjaCard({ node, onClick }: { node: any; onClick: () => void }) {
  const d = getNodeDomainData(node);
  const hun = d.hun || '';
  const sound = d.sound || '';

  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '12px 6px 10px',
        borderRadius: 10,
        border: '0.5px solid var(--ou-border-faint)',
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-raised-sm)',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        minHeight: 90,
        userSelect: 'none',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-neu-raised-lg)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-neu-raised-sm)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-faint)';
      }}
    >
      {/* 한자 */}
      <span style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, color: 'var(--ou-text-heading)', fontFamily: CJK_FONT }}>
        {d.char}
      </span>

      {/* 훈 — plain text */}
      <span style={{
        fontSize: 10,
        color: hun ? 'var(--ou-text-muted)' : 'transparent',
        lineHeight: 1.3,
        textAlign: 'center',
        wordBreak: 'keep-all',
        maxWidth: 'calc(100% - 8px)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minHeight: 13,
      }}>
        {hun || '·'}
      </span>

      {/* 음 — pill 테두리 */}
      {sound ? (
        <span style={{
          display: 'inline-block',
          padding: '1px 8px',
          border: '0.5px solid var(--ou-border-subtle)',
          borderRadius: 999,
          fontSize: 11,
          color: 'var(--ou-text-body)',
          lineHeight: 1.5,
          letterSpacing: '0.03em',
        }}>
          {sound}
        </span>
      ) : (
        <span style={{ height: 18 }} />
      )}
    </div>
  );
}

function DetailPanel({ node, nodes, onClose, onSelect }: { node: any; nodes: any[]; onClose: () => void; onSelect: (node: any) => void }) {
  const d = getNodeDomainData(node);
  const sameRadical = useMemo(() =>
    nodes.filter(n => { const nd = getNodeDomainData(n); return nd.radical === d.radical && nd.char !== d.char; }).slice(0, 20),
    [nodes, d.radical, d.char]
  );
  const sameSound = useMemo(() =>
    d.sound ? nodes.filter(n => { const nd = getNodeDomainData(n); return nd.sound === d.sound && nd.char !== d.char; }).slice(0, 20) : [],
    [nodes, d.sound, d.char]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 4 }}><ArrowLeft size={18} /></button>
        {d.grade && <span style={{ fontSize: 10, padding: '2px 8px', border: '0.5px solid var(--ou-border-subtle)', borderRadius: 4 }}>{d.grade}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, fontFamily: CJK_FONT }}>{d.char}</span>
        <span style={{ fontSize: 18, fontWeight: 500 }}>{d.hun && `${d.hun} `}{d.sound}</span>
        <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
          {d.radical ? `부수: ${d.radical}` : ''}{d.stroke_count ? ` | 총획: ${d.stroke_count}` : ''}
        </span>
      </div>

      {(d.etymology || d.char_type) && (
        <div style={{ padding: 12, border: '0.5px solid var(--ou-border-subtle)', borderRadius: 8 }}>
          {d.char_type && (
            <div style={{ marginBottom: d.etymology ? 4 : 0 }}>
              <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border-subtle)', borderRadius: 4 }}>{d.char_type}</span>
            </div>
          )}
          {d.etymology && <span style={{ fontSize: 13, display: 'block', marginTop: 4 }}>{d.etymology}</span>}
          {d.mnemonic && <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', display: 'block', marginTop: 4, fontStyle: 'italic' }}>{d.mnemonic}</span>}
        </div>
      )}

      {d.compounds && (
        <div style={{ padding: 12, border: '0.5px solid var(--ou-border-subtle)', borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', display: 'block', marginBottom: 4 }}>대표 복합어</span>
          <span style={{ fontSize: 13 }}>{d.compounds}</span>
        </div>
      )}

      {sameRadical.length > 0 && (
        <div>
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', display: 'block', marginBottom: 4 }}>같은 부수 ({d.radical})</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {sameRadical.map(n => (
              <div key={n.id} onClick={() => onSelect(n)} style={{ border: '0.5px solid var(--ou-border-subtle)', borderRadius: 4, cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                {getNodeDomainData(n).char}
              </div>
            ))}
          </div>
        </div>
      )}

      {sameSound.length > 0 && (
        <div>
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', display: 'block', marginBottom: 4 }}>같은 음 ({d.sound})</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {sameSound.map(n => (
              <div key={n.id} onClick={() => onSelect(n)} style={{ border: '0.5px solid var(--ou-border-subtle)', borderRadius: 4, cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
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
  onSearch?: (params: { query?: string; radical?: string; grade?: string; strokeMin?: string; strokeMax?: string; char_type?: string; page?: number }) => void;
  total?: number;
  loading?: boolean;
}

export function DictionaryView({ nodes, onSearch, total, loading }: DictionaryViewProps) {
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
    // 초성 필터는 클라이언트 전용 (API 미지원)
    onSearch({ query: debouncedQuery || undefined, radical: filters.radical, grade: filters.grade, char_type: filters.charType, page });
  }, [debouncedQuery, filters.radical, filters.grade, filters.charType, page, isServerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isServerMode) return;
    if (!debouncedQuery && Object.keys(filters).length === 0) return;
    fetch('/api/log/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchContext: 'dictionary', query: debouncedQuery, filters, resultCount: filteredNodes.length, searchMode: 'client', page }),
    }).catch(() => {});
  }, [debouncedQuery, filters, isServerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredNodes = useMemo(() => {
    const seenChars = new Set<string>();
    let result = nodes.filter(n => {
      const d = getNodeDomainData(n);
      if (d.type !== 'hanja') return false;
      if (d.char && seenChars.has(d.char)) return false;
      if (d.char) seenChars.add(d.char);
      if (!matchesSearchFn(n, debouncedQuery, hanjaChars)) return false;
      if (!matchesFilters(n, filters)) return false;
      return true;
    });
    if (hanjaChars.length > 0) {
      const order = new Map(hanjaChars.map((c, i) => [c, i]));
      result.sort((a, b) => (order.get(getNodeDomainData(a).char) ?? 999) - (order.get(getNodeDomainData(b).char) ?? 999));
    }
    return result;
  }, [nodes, debouncedQuery, hanjaChars, filters]);

  const availableFilters = useMemo(() => getAvailableFilters((nodes ?? []).filter(n => getNodeDomainData(n).type === 'hanja')), [nodes]);

  const totalCount = isServerMode ? (filters.choseong ? filteredNodes.length : (total ?? nodes.length)) : filteredNodes.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pagedNodes = isServerMode
    ? (filters.choseong ? filteredNodes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : filteredNodes)
    : filteredNodes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCardClick = useCallback((node: any) => { setSelectedNode(node); setDrawerOpen(true); }, []);
  const handleFilterChange = useCallback((key: keyof Filters, value: any) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); }, []);
  const clearFilter = useCallback((key: keyof Filters) => { setFilters(prev => { const next = { ...prev }; delete next[key]; return next; }); setPage(1); }, []);
  const toggleFilter = useCallback((key: 'grade' | 'choseong' | 'radical' | 'charType', value: string) => {
    setFilters(prev => {
      if (prev[key] === value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
    setPage(1);
  }, []);
  const handleSearchChange = useCallback((val: string) => { setSearchQuery(val); setPage(1); }, []);

  const activeFiltersCount = Object.keys(filters).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <MagnifyingGlass size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ou-text-muted)' }} />
        <input
          placeholder="한자, 음, 훈 검색 (문장 붙여넣기 가능)"
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          style={{ width: '100%', padding: '8px 32px 8px 32px', fontSize: 14, border: '0.5px solid var(--ou-border-subtle)', borderRadius: 6, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)', color: 'inherit', outline: 'none' }}
        />
        {searchQuery && (
          <button onClick={() => handleSearchChange('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {hanjaChars.length > 0 && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>추출된 한자:</span>
          {hanjaChars.map((c, i) => (
            <span key={i} style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border-subtle)', borderRadius: 4 }}>{c}</span>
          ))}
        </div>
      )}

      {/* 급수 필터 칩 */}
      {availableFilters.grades.length > 0 && (
        <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
          <div style={{ display: 'flex', gap: 4, width: 'max-content' }}>
            {availableFilters.grades.map(([grade]) => (
              <button
                key={grade}
                onClick={() => toggleFilter('grade', grade)}
                style={filters.grade === grade ? chipActive : chipBase}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 초성 필터 칩 */}
      <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
        <div style={{ display: 'flex', gap: 4, width: 'max-content' }}>
          {CHOSEONG.map(cho => (
            <button
              key={cho}
              onClick={() => toggleFilter('choseong', cho)}
              style={filters.choseong === cho ? chipActive : chipBase}
            >
              {cho}
            </button>
          ))}
        </div>
      </div>

      {/* 부수 드롭다운 (옵션) */}
      {availableFilters.radicals.length > 0 && (
        <div>
          <select
            value={filters.radical || ''}
            onChange={e => e.target.value ? handleFilterChange('radical', e.target.value) : clearFilter('radical')}
            style={{ padding: '4px 8px', fontSize: 12, border: '0.5px solid var(--ou-border-subtle)', borderRadius: 6, background: 'var(--ou-bg)', color: 'inherit', width: 100 }}
          >
            <option value="">부수 전체</option>
            {availableFilters.radicals.slice(0, 50).map(([char, count]) => (
              <option key={char} value={char}>{char} ({count})</option>
            ))}
          </select>
        </div>
      )}

      {/* 활성 필터 + count */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {loading && <div style={{ width: 12, height: 12, border: `2px solid var(--ou-text-muted)`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
        <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{totalCount.toLocaleString()}자</span>
        {activeFiltersCount > 0 && (
          <button
            onClick={() => { setFilters({}); setPage(1); }}
            style={{ fontSize: 11, padding: '1px 8px', border: '0.5px solid var(--ou-border-subtle)', borderRadius: 12, background: 'none', cursor: 'pointer', color: 'var(--ou-text-muted)' }}
          >
            필터 초기화 ×
          </button>
        )}
      </div>

      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8 }}>
        {pagedNodes.filter(n => getNodeDomainData(n).char).map(node => (
          <HanjaCard key={node.id} node={node} onClick={() => handleCardClick(node)} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 12 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: '4px 8px', border: '0.5px solid var(--ou-border-subtle)', borderRadius: 4, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)', cursor: page <= 1 ? 'default' : 'pointer', color: 'inherit', opacity: page <= 1 ? 0.3 : 1 }}>Prev</button>
          <span style={{ padding: '4px 8px', fontSize: 12 }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ padding: '4px 8px', border: '0.5px solid var(--ou-border-subtle)', borderRadius: 4, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)', cursor: page >= totalPages ? 'default' : 'pointer', color: 'inherit', opacity: page >= totalPages ? 0.3 : 1 }}>Next</button>
        </div>
      )}

      {/* Detail drawer */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setDrawerOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 380, maxWidth: '90vw', height: '100vh', overflowY: 'auto', background: 'var(--ou-bg)', borderLeft: '0.5px solid var(--ou-border-subtle)' }}>
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
